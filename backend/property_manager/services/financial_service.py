from __future__ import annotations

from calendar import monthrange
from datetime import date
from decimal import Decimal, InvalidOperation

from ..database import transaction
from ..repositories.financial_repository import FinancialRepository


class FinancialValidationError(ValueError): pass
class FinancialNotFoundError(LookupError): pass
class FinancialConflictError(RuntimeError): pass

METHODS={"Electronic Transfer","Cheque","Cash","Direct Deposit","Other"}


def next_month(period):
    year,month=map(int,period.split("-")); return f"{year+(month==12):04d}-{1 if month==12 else month+1:02d}"


class FinancialService:
    def __init__(self,repository=None): self.repository=repository or FinancialRepository()

    def list_payments(self): return [self._payment(r) for r in self.repository.list_payments()]
    def list_credits(self): return [self._credit(r) for r in self.repository.list_credits()]
    def outstanding(self,lease_id):
        return [self._obligation(r) for r in self.repository.obligations(lease_id)
                if Decimal(r["expected_amount"])-Decimal(r["paid"])>Decimal(".005")]

    def create_payment(self,payload):
        v=self._payment_input(payload)
        with transaction() as connection:
            if not self.repository.one(connection,"leases",v["lease_id"]): raise FinancialValidationError("The selected lease does not exist.")
            if v["tenant_id"] and not self.repository.one(connection,"tenants",v["tenant_id"]): raise FinancialValidationError("The selected tenant does not exist.")
            if sum((x["amount"] for x in v["allocations"]),Decimal("0"))>v["amount"]+Decimal(".005"):
                raise FinancialValidationError("Allocations cannot exceed the payment amount.")
            checked=[]
            for item in v["allocations"]:
                obligation=self.repository.one(connection,"rent_obligations",item["obligation_id"])
                if not obligation or int(obligation["lease_id"])!=v["lease_id"]: raise FinancialValidationError("An allocation does not belong to the selected lease.")
                paid=sum((Decimal(r["amount"]) for r in self.repository.allocations_for(connection,"obligation_id",item["obligation_id"])),Decimal("0"))
                if item["amount"]>Decimal(obligation["expected_amount"])-paid+Decimal(".005"): raise FinancialConflictError("An allocation exceeds the outstanding charge.")
                checked.append((obligation,paid,item))
            payment_id=self.repository.next_id(connection,"payments"); self.repository.insert_payment(connection,payment_id,v)
            allocation_id=self.repository.next_id(connection,"payment_allocations")
            self.repository.insert_allocations(connection,[(allocation_id+i,payment_id,x["obligation_id"],x["amount"]) for i,x in enumerate(v["allocations"])])
            for obligation,paid,item in checked: self.repository.set_status(connection,int(obligation["id"]),Decimal(obligation["expected_amount"]),paid+item["amount"])
        return {"id":payment_id}

    def void_payment(self,payment_id,payload):
        reason=str((payload or {}).get("reason","")).strip()
        if not reason: raise FinancialValidationError("Enter a reason for voiding the payment.")
        with transaction() as connection:
            payment=self.repository.one(connection,"payments",payment_id)
            if not payment: raise FinancialNotFoundError("Payment not found.")
            if payment["status"]=="Voided": raise FinancialConflictError("This payment has already been voided.")
            allocations=self.repository.allocations_for(connection,"payment_id",payment_id)
            self.repository.void_payment(connection,payment_id,reason)
            for allocation in allocations:
                obligation=self.repository.one(connection,"rent_obligations",allocation["obligation_id"])
                if obligation:
                    paid=sum((Decimal(r["amount"]) for r in self.repository.allocations_for(connection,"obligation_id",obligation["id"])),Decimal("0"))
                    self.repository.set_status(connection,obligation["id"],Decimal(obligation["expected_amount"]),paid)

    def apply_credit(self,payment_id,payload):
        try: obligation_id=int((payload or {}).get("obligationId",0)); amount=Decimal(str((payload or {}).get("amount",0)))
        except (TypeError,ValueError,InvalidOperation): raise FinancialValidationError("Credit application values are invalid.") from None
        if amount<=0: raise FinancialValidationError("Credit amount must be greater than zero.")
        with transaction() as connection:
            payment=self.repository.one(connection,"payments",payment_id); obligation=self.repository.one(connection,"rent_obligations",obligation_id)
            if not payment or not obligation: raise FinancialNotFoundError("Payment or obligation not found.")
            if payment["status"]!="Posted": raise FinancialConflictError("A voided payment has no available credit.")
            if int(payment["lease_id"])!=int(obligation["lease_id"]): raise FinancialValidationError("Credit and charge must belong to the same lease.")
            used=sum((Decimal(r["amount"]) for r in self.repository.allocations_for(connection,"payment_id",payment_id)),Decimal("0"))
            paid=sum((Decimal(r["amount"]) for r in self.repository.allocations_for(connection,"obligation_id",obligation_id)),Decimal("0"))
            if amount>Decimal(payment["amount"])-used+Decimal(".005"): raise FinancialConflictError("Amount exceeds available credit.")
            if amount>Decimal(obligation["expected_amount"])-paid+Decimal(".005"): raise FinancialConflictError("Amount exceeds the selected outstanding charge.")
            row_id=self.repository.next_id(connection,"payment_allocations"); self.repository.insert_allocations(connection,[(row_id,payment_id,obligation_id,amount)])
            self.repository.set_status(connection,obligation_id,Decimal(obligation["expected_amount"]),paid+amount)

    def ensure(self,through):
        self._period(through); context=self.repository.context()
        with transaction() as connection:
            next_id=self.repository.next_id(connection,"rent_obligations")
            existing={(int(r["lease_id"]),r["rent_period"]) for r in context["obligations"]}
            for lease in context["leases"]:
                if lease["status"]=="Terminated": continue
                period=lease["start_date"].isoformat()[:7]
                end=through if lease["term_type"]=="Month-to-Month" else min(lease["end_date"].isoformat()[:7],through)
                while period<=end:
                    gross=sum((Decimal(r["amount"]) for r in context["charges"] if int(r["lease_id"])==int(lease["id"]) and r["frequency"]=="Monthly" and r["start_date"].isoformat()[:7]<=period<=r["end_date"].isoformat()[:7]),Decimal("0"))
                    credit=sum((Decimal(r["amount"]) for r in context["concessions"] if int(r["lease_id"])==int(lease["id"]) and r["start_period"]<=period<=r["end_period"]),Decimal("0"))
                    expected=max(gross-credit,Decimal("0"))
                    if (int(lease["id"]),period) not in existing and expected>Decimal(".005"):
                        self.repository.insert_obligation(connection,next_id,lease["id"],period,expected); next_id+=1
                    period=next_month(period)

    def rent_roll(self,period):
        self.ensure(period); c=self.repository.context(); rows=[]
        for lease in c["leases"]:
            start=lease["start_date"].isoformat()[:7]; end="9999-12" if lease["term_type"]=="Month-to-Month" else lease["end_date"].isoformat()[:7]
            if start>period: continue
            obs=[r for r in c["obligations"] if int(r["lease_id"])==int(lease["id"]) and start<=r["rent_period"]<=min(period,end)]
            current=next((r for r in obs if r["rent_period"]==period),None); prior=[r for r in obs if r["rent_period"]<period]
            balance=lambda r:max(Decimal(r["expected_amount"])-Decimal(r["paid"]),Decimal("0"))
            prior_balance=sum((balance(r) for r in prior),Decimal("0")); current_balance=balance(current) if current else Decimal("0")
            unpaid=[r for r in obs if balance(r)>Decimal(".005")]; unit=next(r for r in c["units"] if int(r["id"])==int(lease["unit_id"]))
            people=[r for r in c["participants"] if int(r["lease_id"])==int(lease["id"])]; primary=people[0] if people else None; total=prior_balance+current_balance
            rows.append({"leaseId":int(lease["id"]),"unitLabel":self._unit_label(unit),"primaryTenant":f"{primary['first_name']} {primary['last_name']}" if primary else "Unknown",
                "selectedPeriod":period,"currentMonthDue":float(current["expected_amount"]) if current else 0,"currentMonthPaid":float(current["paid"]) if current else 0,
                "priorBalance":float(prior_balance),"totalOutstanding":float(total),"oldestUnpaidPeriod":unpaid[0]["rent_period"] if unpaid else "",
                "monthsInArrears":len([r for r in unpaid if r["rent_period"]<period]),"status":"Current" if total<=Decimal(".005") else "In Arrears" if prior_balance>Decimal(".005") else "Partial"})
        return rows

    def rent_status(self,periods,current):
        if not periods:return []
        for p in periods:self._period(p)
        self.ensure(periods[-1]); c=self.repository.context(); payment_map={int(r["id"]):r for r in c["payments"]}; rows=[]
        for unit in c["units"]:
            if not unit["active"]:continue
            leases=sorted([r for r in c["leases"] if int(r["unit_id"])==int(unit["id"])],key=lambda r:r["start_date"],reverse=True)
            displayed=next((le for le in leases if any(self._applies(le,p) for p in periods)),leases[0] if leases else None)
            people=[r for r in c["participants"] if displayed and int(r["lease_id"])==int(displayed["id"])]
            occupants=[{"tenantId":int(r["tenant_id"]),"name":f"{r['first_name']} {r['last_name']}","role":"Primary Tenant" if r["is_primary"] else "Additional Tenant","email":r["email"],"phone":r["phone"]} for r in people]
            months=[]
            for period in periods:
                lease=next((r for r in leases if self._applies(r,period)),None)
                obligation=next((r for r in c["obligations"] if lease and int(r["lease_id"])==int(lease["id"]) and r["rent_period"]==period),None)
                if not obligation: months.append({"period":period,"expected":0,"paid":0,"remaining":0,"collectionRate":0,"state":"Not Applicable","allocations":[]});continue
                alloc=[r for r in c["allocations"] if int(r["obligation_id"])==int(obligation["id"])];paid=sum((Decimal(r["amount"]) for r in alloc),Decimal("0"));expected=Decimal(obligation["expected_amount"]);future=period>current
                state=("Paid Ahead" if future else "Paid") if paid>=expected-Decimal(".005") else (("Partial Prepayment" if future else "Partial") if paid>Decimal(".005") else ("Not Yet Due" if future else "Unpaid"))
                months.append({"period":period,"expected":float(expected),"paid":float(paid),"remaining":float(max(expected-paid,0)),"collectionRate":min(float(paid/expected*100),100) if expected else 0,"state":state,"obligationId":int(obligation["id"]),
                    "allocations":[{"paymentId":int(a["payment_id"]),"receivedDate":payment_map[int(a["payment_id"])]["received_date"].isoformat(),"amount":float(a["amount"]),"paymentAmount":float(payment_map[int(a["payment_id"])]["amount"]),"reference":payment_map[int(a["payment_id"])]["reference"],"source":payment_map[int(a["payment_id"])]["source"]} for a in alloc]})
            due=[m for m in months if m["period"]<=current];rows.append({"unitId":int(unit["id"]),"leaseId":int(displayed["id"]) if displayed else None,"unitLabel":self._unit_label(unit),"tenantNames":", ".join(r["name"] for r in occupants),"occupants":occupants,"months":months,"outstandingToday":sum(m["remaining"] for m in due),"monthsBehind":len([m for m in due if m["remaining"]>.005])})
        return rows

    def client_context(self,through):
        self.ensure(through);c=self.repository.context()
        date_value=lambda value:value.isoformat() if value else ""
        return {
          "units":[{"id":int(r["id"]),"buildingId":int(r["building_id"]),"apartmentNumber":r["apartment_number"],"bedrooms":float(r["bedrooms"]),"bathrooms":float(r["bathrooms"]),"monthlyRent":float(r["monthly_rent"]),"status":r["status"],"active":bool(r["active"])} for r in c["units"]],
          "buildings":[{"id":int(r["id"]),"locationId":int(r["location_id"]),"civicAddress":r["civic_address"],"city":r["city"],"stateProvince":r["state_province"],"postalCode":r["postal_code"]} for r in c["buildings"]],
          "locations":[{"id":int(r["id"]),"name":r["name"],"city":r["city"]} for r in c["locations"]],
          "leases":[{"id":int(r["id"]),"unitId":int(r["unit_id"]),"startDate":date_value(r["start_date"]),"endDate":"" if r["term_type"]=="Month-to-Month" else date_value(r["end_date"]),"termType":r["term_type"],"status":r["status"],"renewalStatus":r["renewal_status"],"renewalLetterSentDate":date_value(r["renewal_letter_sent_date"]),"renewalResponseDate":date_value(r["renewal_response_date"]),"renewalNotes":r["renewal_notes"],"notes":r["notes"]} for r in c["leases"]],
          "recurringCharges":[{"id":int(r["id"]),"leaseId":int(r["lease_id"]),"chargeType":r["charge_type"],"description":r["description"],"amount":float(r["amount"]),"frequency":r["frequency"],"startDate":date_value(r["start_date"]),"endDate":"" if r["end_date"].year==9999 else date_value(r["end_date"])} for r in c["charges"]],
          "participants":[{"id":int(r["id"]),"leaseId":int(r["lease_id"]),"tenantId":int(r["tenant_id"]),"primary":bool(r["is_primary"]),"sortOrder":int(r["sort_order"])} for r in c["participants"]],
          "tenants":[{"id":int(r["id"]),"firstName":r["first_name"],"lastName":r["last_name"],"email":r["email"],"phone":r["phone"],"active":bool(r["active"])} for r in c["tenants"]],
          "payments":[{"id":int(r["id"]),"leaseId":int(r["lease_id"]),"tenantId":int(r["tenant_id"]) if r["tenant_id"] else None,"receivedDate":date_value(r["received_date"]),"amount":float(r["amount"]),"paymentMethod":r["payment_method"],"reference":r["reference"],"notes":r["notes"],"source":r["source"],"status":r["status"],"voidedAt":date_value(r["voided_at"]),"voidReason":r["void_reason"],"createdAt":date_value(r["created_at"])} for r in c["payments"]],
          "obligations":[self._obligation(r) for r in c["obligations"]],
          "allocations":[{"id":int(r["id"]),"paymentId":int(r["payment_id"]),"obligationId":int(r["obligation_id"]),"amount":float(r["amount"])} for r in c["allocations"]],
          "history":[{"id":int(r["id"]),"bankTransactionId":int(r["bank_transaction_id"]),"paymentId":int(r["payment_id"]),"leaseId":int(r["lease_id"]),"amount":float(r["amount"]),"postedDate":date_value(r["posted_date"]),"postedDay":int(r["posted_day"]),"normalizedName":r["normalized_name"],"normalizedMemo":r["normalized_memo"],"createdAt":date_value(r["created_at"])} for r in c["history"]],
        }

    @staticmethod
    def _payment_input(payload):
        if not isinstance(payload,dict):raise FinancialValidationError("A JSON object is required.")
        try:
            lease_id=int(payload.get("leaseId",0));tenant=payload.get("tenantId");tenant_id=int(tenant) if tenant else None;received=date.fromisoformat(str(payload.get("receivedDate","")));amount=Decimal(str(payload.get("amount",0)))
            allocations=[{"obligation_id":int(r.get("obligationId",0)),"amount":Decimal(str(r.get("amount",0)))} for r in payload.get("allocations",[]) if Decimal(str(r.get("amount",0)))>0]
        except (TypeError,ValueError,InvalidOperation):raise FinancialValidationError("Payment values are invalid.") from None
        method=str(payload.get("paymentMethod",""))
        if not lease_id:raise FinancialValidationError("Select a lease.")
        if amount<=0:raise FinancialValidationError("Payment amount must be greater than zero.")
        if method not in METHODS:raise FinancialValidationError("Payment method is invalid.")
        return {"lease_id":lease_id,"tenant_id":tenant_id,"received_date":received,"amount":amount,"payment_method":method,"reference":str(payload.get("reference","")).strip(),"notes":str(payload.get("notes","")).strip(),"allocations":allocations}

    @staticmethod
    def _unit_label(r):return " · ".join(str(v) for v in (r["civic_address"],r["apartment_number"],r["location_name"]) if v)
    @staticmethod
    def _payment(r):
        allocated=Decimal(r["allocated"]);voided=r["status"]=="Voided"
        return {"id":int(r["id"]),"leaseId":int(r["lease_id"]),"tenantId":int(r["tenant_id"]) if r["tenant_id"] else None,"receivedDate":r["received_date"].isoformat(),"amount":float(r["amount"]),"paymentMethod":r["payment_method"],"reference":r["reference"],"notes":r["notes"],"source":r["source"],"status":r["status"],"voidedAt":r["voided_at"].isoformat() if r["voided_at"] else None,"voidReason":r["void_reason"],"createdAt":r["created_at"].isoformat(),"unitLabel":FinancialService._unit_label(r),"allocated":0 if voided else float(allocated),"unapplied":0 if voided else float(Decimal(r["amount"])-allocated),"effectiveStatus":r["status"]}
    @staticmethod
    def _credit(r):
        allocated=Decimal(r["allocated"]);return {"paymentId":int(r["id"]),"leaseId":int(r["lease_id"]),"receivedDate":r["received_date"].isoformat(),"reference":r["reference"] or "—","amount":float(r["amount"]),"allocated":float(allocated),"remaining":float(Decimal(r["amount"])-allocated),"unitLabel":FinancialService._unit_label(r),"tenantName":r["tenant_name"]}
    @staticmethod
    def _obligation(r):
        paid=Decimal(r["paid"]);expected=Decimal(r["expected_amount"]);remaining=max(expected-paid,0)
        return {"id":int(r["id"]),"leaseId":int(r["lease_id"]),"rentPeriod":r["rent_period"],"expectedAmount":float(expected),"status":r["status"],"createdAt":r["created_at"].isoformat(),"paid":float(paid),"remaining":float(remaining),"balance":float(remaining)}
    @staticmethod
    def _period(p):
        try:y,m=map(int,p.split("-"));monthrange(y,m)
        except (TypeError,ValueError):raise FinancialValidationError("Rent period must use YYYY-MM format.") from None
    @staticmethod
    def _applies(lease,p):
        if lease["status"]=="Terminated":return False
        start=lease["start_date"].isoformat()[:7];end="9999-12" if lease["term_type"]=="Month-to-Month" else lease["end_date"].isoformat()[:7]
        return start<=p<=end
