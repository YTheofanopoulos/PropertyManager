from datetime import date
from decimal import Decimal,InvalidOperation
from ..database import transaction
from ..repositories.bank_repository import BankRepository
from ..repositories.financial_repository import FinancialRepository

class BankValidationError(ValueError):pass
class BankNotFoundError(LookupError):pass
class BankConflictError(RuntimeError):pass

class BankService:
 def __init__(self,repository=None):self.repository=repository or BankRepository();self.financial=FinancialRepository()
 def batches(self):return [self._batch(r) for r in self.repository.batches()]
 def transactions(self):return [self._transaction(r) for r in self.repository.transactions()]
 def get(self,row_id):
  row=self.repository.transaction(row_id)
  if not row:raise BankNotFoundError("Bank transaction not found.")
  return self._transaction(row)
 def preview(self,payload):
  account=str((payload or {}).get("accountLastFour","")).strip();rows=(payload or {}).get("transactions",[])
  with transaction() as connection:duplicates=self.repository.duplicate_keys(connection,account,[str(r.get("externalId","")) for r in rows])
  return {str(r.get("externalId","")):str(r.get("externalId","")) in duplicates for r in rows}
 def commit(self,payload):
  if not isinstance(payload,dict):raise BankValidationError("A JSON object is required.")
  statement=payload.get("statement") or {};rows=[r for r in payload.get("rows",[]) if r.get("result")=="New"]
  try:
   batch={"filename":str(payload.get("filename","")).strip(),"account":str(statement.get("accountLastFour","")).strip(),"currency":str(statement.get("currency","CAD")),"start":date.fromisoformat(str(statement.get("statementStart",""))),"end":date.fromisoformat(str(statement.get("statementEnd",""))),"count":len(payload.get("rows",[])),"credits":Decimal(str(payload.get("totalCredits",0))),"debits":Decimal(str(payload.get("totalDebits",0))),"duplicates":int(payload.get("duplicateCount",0))}
   normalized=[{"externalId":str(r.get("externalId","")),"postedDate":date.fromisoformat(str(r.get("postedDate",""))),"amount":Decimal(str(r.get("amount",0))),"transactionType":str(r.get("transactionType","")),"name":str(r.get("name","")),"memo":str(r.get("memo",""))} for r in rows]
  except (ValueError,TypeError,InvalidOperation):raise BankValidationError("Bank import values are invalid.") from None
  if not batch["filename"] or not batch["account"]:raise BankValidationError("Filename and account are required.")
  with transaction() as connection:
   duplicates=self.repository.duplicate_keys(connection,batch["account"],[r["externalId"] for r in normalized])
   normalized=[r for r in normalized if r["externalId"] not in duplicates];batch_id=self.repository.next_id(connection,"bank_import_batches");self.repository.insert_import(connection,batch_id,batch,normalized)
  return {"id":batch_id}
 def ignore(self,row_id,payload):
  reason=str((payload or {}).get("reason","")).strip()
  if not reason:raise BankValidationError("Enter a reason for ignoring the transaction.")
  with transaction() as connection:
   if not self.repository.ignore(connection,row_id,reason):raise BankConflictError("A reconciled or missing transaction cannot be ignored.")
 def reconcile(self,row_id,payload):
  try:lease_id=int((payload or {}).get("leaseId",0));allocations=[{"obligation_id":int(r.get("obligationId",0)),"amount":Decimal(str(r.get("amount",0)))} for r in (payload or {}).get("allocations",[]) if Decimal(str(r.get("amount",0)))>0]
  except (ValueError,TypeError,InvalidOperation):raise BankValidationError("Reconciliation values are invalid.") from None
  with transaction() as connection:
   bank=self.repository.transaction_for_update(connection,row_id)
   if not bank:raise BankNotFoundError("Bank transaction not found.")
   if bank["status"]=="Reconciled":raise BankConflictError("This transaction is already reconciled.")
   if Decimal(bank["amount"])<=0:raise BankValidationError("Only credit transactions can be reconciled as rent.")
   if not allocations or sum((r["amount"] for r in allocations),Decimal("0"))>Decimal(bank["amount"])+Decimal(".005"):raise BankValidationError("Allocate a valid amount not exceeding the transaction.")
   checked=[]
   for item in allocations:
    obligation=self.financial.one(connection,"rent_obligations",item["obligation_id"])
    if not obligation or int(obligation["lease_id"])!=lease_id:raise BankValidationError("An allocation does not belong to the selected unit.")
    paid=sum((Decimal(r["amount"]) for r in self.financial.allocations_for(connection,"obligation_id",item["obligation_id"])),Decimal("0"))
    if item["amount"]>Decimal(obligation["expected_amount"])-paid+Decimal(".005"):raise BankConflictError("An allocation exceeds the outstanding charge.")
    checked.append((obligation,paid,item))
   payment_id=self.repository.next_id(connection,"payments");self.repository.reconcile(connection,bank,payment_id,lease_id,allocations)
   for obligation,paid,item in checked:self.financial.set_status(connection,obligation["id"],Decimal(obligation["expected_amount"]),paid+item["amount"])
  return {"paymentId":payment_id}
 @staticmethod
 def _batch(r):return {"id":int(r["id"]),"filename":r["filename"],"importedAt":r["imported_at"].isoformat(),"accountLastFour":r["account_last_four"],"currency":r["currency"],"statementStart":r["statement_start"].isoformat(),"statementEnd":r["statement_end"].isoformat(),"transactionCount":int(r["transaction_count"]),"totalCredits":float(r["total_credits"]),"totalDebits":float(r["total_debits"]),"newTransactionCount":int(r["new_transaction_count"]),"duplicateCount":int(r["duplicate_count"]),"status":r["status"]}
 @staticmethod
 def _transaction(r):return {"id":int(r["id"]),"importBatchId":int(r["import_batch_id"]),"externalId":r["external_id"],"accountLastFour":r["account_last_four"],"postedDate":r["posted_date"].isoformat(),"amount":float(r["amount"]),"transactionType":r["transaction_type"],"name":r["name"],"memo":r["memo"],"status":r["status"],"matchedPaymentId":int(r["matched_payment_id"]) if r["matched_payment_id"] else None,"ignoredReason":r["ignored_reason"],"createdAt":r["created_at"].isoformat()}
