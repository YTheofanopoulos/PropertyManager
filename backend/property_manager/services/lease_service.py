from __future__ import annotations

from datetime import date, timedelta
from calendar import monthrange
from decimal import Decimal, InvalidOperation
from typing import Any

from ..database import transaction
from ..repositories.lease_repository import LeaseRepository


class LeaseValidationError(ValueError): pass
class LeaseNotFoundError(LookupError): pass
class LeaseConflictError(RuntimeError): pass

LEASE_STATUSES = {"Active", "Expired", "Future", "Terminated"}
RENEWAL_STATUSES = {
    "Not Started", "Renewal Letter Sent", "Accepted", "Renewed",
    "Under Dispute", "Non-Renewal"
}
CHARGE_TYPES = {"Apartment Rent", "Parking", "Storage", "Other"}


class LeaseService:
    def __init__(self, repository=None):
        self.repository = repository or LeaseRepository()

    def list_leases(self):
        return [self._serialize(row, True) for row in self.repository.list_leases()]

    def get_lease(self, lease_id):
        row = self.repository.get_with_successor(lease_id)
        if row is None: raise LeaseNotFoundError("Lease not found.")
        return self._serialize(row)

    def history(self, lease_id):
        self.get_lease(lease_id)
        return [{"id": int(row["id"]),
                 "previousLeaseId": int(row["previous_lease_id"]) if row["previous_lease_id"] else None,
                 "startDate": row["start_date"].isoformat(),
                 "endDate": "" if row["term_type"] == "Month-to-Month" else row["end_date"].isoformat(),
                 "termType": row["term_type"], "status": row["status"],
                 "renewalStatus": row["renewal_status"],
                 "monthlyTotal": float(row["monthly_total"])}
                for row in self.repository.history(lease_id)]

    def renewal_draft(self, lease_id):
        lease = self.get_lease(lease_id)
        if lease["renewalStatus"] != "Accepted":
            raise LeaseConflictError("The renewal must be accepted before it can be started.")
        if lease.get("successorLeaseId"):
            raise LeaseConflictError("A successor lease has already been created.")
        if lease["termType"] == "Month-to-Month" or not lease["endDate"]:
            raise LeaseConflictError("An open-ended lease needs an end date before renewal.")
        old_start, old_end = date.fromisoformat(lease["startDate"]), date.fromisoformat(lease["endDate"])
        new_start = old_end + timedelta(days=1)
        term_months = ((new_start.year - old_start.year) * 12
                       + new_start.month - old_start.month)
        new_end = (self._add_months(new_start, term_months) - timedelta(days=1)
                   if term_months > 0 and new_start.day == old_start.day
                   else new_start + (old_end - old_start))
        charges = self.charges(lease_id)
        current_rent = next((item["amount"] for item in charges
                             if item["chargeType"] == "Apartment Rent"), 0)
        current_total = sum(item["amount"] for item in charges
                            if item["frequency"] == "Monthly")
        proposed = lease.get("renewalProposedRent")
        for charge in charges:
            charge.pop("id", None)
            charge.pop("leaseId", None)
            charge["startDate"], charge["endDate"] = new_start.isoformat(), new_end.isoformat()
            if charge["chargeType"] == "Apartment Rent" and proposed is not None:
                charge["amount"] = proposed
        shift = (new_start.year - old_start.year) * 12 + new_start.month - old_start.month
        concessions = self.concessions(lease_id)
        for item in concessions:
            item.pop("id", None)
            item.pop("leaseId", None)
            item["startPeriod"] = self._shift_period(item["startPeriod"], shift)
            item["endPeriod"] = self._shift_period(item["endPeriod"], shift)
        participants = self.participants(lease_id)
        return {"sourceLease": lease, "currentRent": current_rent,
                "currentMonthlyTotal": current_total,
                "renewal": {"unitId": lease["unitId"],
                            "startDate": new_start.isoformat(),
                            "endDate": new_end.isoformat(), "termType": lease["termType"],
                            "status": "Future", "notes": lease.get("notes", ""),
                            "renewalStatus": "Not Started", "renewalLetterSentDate": "",
                            "renewalResponseDate": "", "renewalNotes": "",
                            "participantIds": [row["tenantId"] for row in participants],
                            "primaryTenantId": next((row["tenantId"] for row in participants if row["primary"]), 0),
                            "charges": charges, "concessions": concessions}}

    def create_renewal(self, lease_id, payload):
        values = self._validate(payload)
        values["previous_lease_id"] = lease_id
        with transaction() as connection:
            source = self.repository.get_by_id(lease_id)
            if source is None: raise LeaseNotFoundError("Lease not found.")
            if source["renewal_status"] != "Accepted":
                raise LeaseConflictError("The renewal must be accepted before it can be created.")
            if self.repository.successor_id(connection, lease_id):
                raise LeaseConflictError("A successor lease has already been created.")
            new_id = self.repository.next_id(connection, "leases")
            self._persist(connection, values, new_id, True)
            self.repository.complete_renewal(connection, lease_id)
        return self.get_lease(new_id)

    def participants(self, lease_id):
        self.get_lease(lease_id)
        return [{"id": int(row["id"]), "leaseId": int(row["lease_id"]),
                 "tenantId": int(row["tenant_id"]),
                 "primary": bool(row["is_primary"]),
                 "sortOrder": int(row["sort_order"])}
                for row in self.repository.get_related("lease_participants", lease_id)]

    def charges(self, lease_id):
        self.get_lease(lease_id)
        return [self._charge(row) for row in
                self.repository.get_related("recurring_charges", lease_id)]

    def concessions(self, lease_id):
        self.get_lease(lease_id)
        return [self._concession(row) for row in
                self.repository.get_related("lease_concessions", lease_id)]

    def save(self, payload, lease_id=None):
        values = self._validate(payload)
        with transaction() as connection:
            creating = lease_id is None
            if creating:
                lease_id = self.repository.next_id(connection, "leases")
            else:
                existing = self.repository.get_by_id(lease_id)
                if existing is None: raise LeaseNotFoundError("Lease not found.")
                values["previous_lease_id"] = existing.get("previous_lease_id")
            self._persist(connection, values, lease_id, creating)
        return self.get_lease(lease_id)

    def _persist(self, connection, values, lease_id, creating):
        if not creating and not self.repository.exists(connection, "leases", lease_id):
            raise LeaseNotFoundError("Lease not found.")
        if not self.repository.exists(connection, "units", values["unit_id"]):
            raise LeaseValidationError("The selected unit does not exist.")
        for tenant_id in values["participant_ids"]:
            if not self.repository.exists(connection, "tenants", tenant_id):
                raise LeaseValidationError("A selected tenant does not exist.")

        if values["status"] in {"Active", "Future"}:
            overlap = self.repository.overlapping_unit(
                connection, values["unit_id"], values["start_date"],
                values["end_date"], lease_id)
            if overlap:
                raise LeaseConflictError(
                    "These dates overlap another lease for the selected unit."
                )
            for tenant_id in values["participant_ids"]:
                overlap = self.repository.overlapping_tenant(
                    connection, tenant_id, values["start_date"],
                    values["end_date"], lease_id)
                if overlap:
                    raise LeaseConflictError(
                        "A selected tenant already belongs to another lease "
                        "covering this timeframe."
                    )

        existing_charges = [] if creating else self.repository.related(
            connection, "recurring_charges", lease_id)
        existing_concessions = [] if creating else self.repository.related(
            connection, "lease_concessions", lease_id)
        self._validate_concessions(
            connection, lease_id, values["concessions"], existing_concessions
        )
        financial_changed = creating or self._financial_changed(
            values, existing_charges, existing_concessions,
            self.repository.get_by_id(lease_id) if not creating else None,
        )

        self.repository.upsert_lease(connection, lease_id, values, creating)
        self.repository.replace_participants(
            connection, lease_id, values["participant_ids"])
        self.repository.replace_charges(
            connection, lease_id, values["charges"], values["start_date"],
            values["end_date"])
        self.repository.sync_concessions(
            connection, lease_id, values["concessions"], existing_concessions)
        if financial_changed:
            self._reconcile_obligations(connection, lease_id, values)
        self.repository.refresh_unit(connection, values["unit_id"], date.today())

    def terminate(self, lease_id):
        with transaction() as connection:
            row = self.repository.get_by_id(lease_id)
            if row is None: raise LeaseNotFoundError("Lease not found.")
            self.repository.set_lease_status(connection, lease_id, "Terminated")
            self.repository.refresh_unit(connection, int(row["unit_id"]), date.today())

    def _validate_concessions(self, connection, lease_id, incoming, existing):
        existing_map = {int(row["id"]): row for row in existing}
        incoming_ids = {item["id"] for item in incoming if item.get("id")}
        for item in existing:
            if int(item["id"]) not in incoming_ids and self.repository.concession_has_allocations(
                connection, lease_id, item["start_period"], item["end_period"]):
                raise LeaseConflictError(
                    "This concession cannot be deleted because it affects a period "
                    "with allocated payments."
                )
        for item in incoming:
            if not item.get("id"): continue
            original = existing_map.get(item["id"])
            if not original: raise LeaseValidationError("An existing concession was not found.")
            if (Decimal(original["amount"]) != item["amount"] or
                    original["start_period"] != item["start_period"] or
                    original["end_period"] != item["end_period"]):
                raise LeaseConflictError(
                    "A recorded concession's amount and effective period cannot be changed."
                )

    def _reconcile_obligations(self, connection, lease_id, values):
        start_period = values["start_date"].isoformat()[:7]
        end_period = values["end_date"].isoformat()[:7]
        monthly = sum((item["amount"] for item in values["charges"]), Decimal("0"))
        for obligation in self.repository.obligations(connection, lease_id):
            period, paid = obligation["rent_period"], Decimal(obligation["paid"])
            if period < start_period or period > end_period:
                if paid > Decimal("0.005"):
                    raise LeaseConflictError(
                        f"The lease dates cannot exclude {period} because a payment "
                        "is allocated to that period."
                    )
                self.repository.delete_obligation(connection, obligation["id"])
                continue
            concession = sum((item["amount"] for item in values["concessions"]
                              if item["start_period"] <= period <= item["end_period"]),
                             Decimal("0"))
            expected = max(monthly - concession, Decimal("0"))
            if paid > expected + Decimal("0.005"):
                raise LeaseConflictError(
                    f"The revised charges and concessions would reduce {period} "
                    "below its allocated payment amount."
                )
            if expected <= Decimal("0.005") and paid <= Decimal("0.005"):
                self.repository.delete_obligation(connection, obligation["id"])
                continue
            status = ("Unpaid" if paid <= Decimal("0.005") else
                      "Partially Paid" if paid < expected - Decimal("0.005") else
                      "Paid" if paid <= expected + Decimal("0.005") else "Overpaid")
            self.repository.update_obligation(
                connection, obligation["id"], expected, status)

    @staticmethod
    def _financial_changed(values, charges, concessions, lease):
        if lease is None: return True
        old_charges = sorted((row["charge_type"], Decimal(row["amount"])) for row in charges)
        new_charges = sorted((row["charge_type"], row["amount"])
                             for row in values["charges"] if row["amount"] > 0)
        old_concessions = sorted((int(row["id"]), Decimal(row["amount"]),
                                  row["start_period"], row["end_period"])
                                 for row in concessions)
        new_concessions = sorted((row.get("id") or -1, row["amount"],
                                  row["start_period"], row["end_period"])
                                 for row in values["concessions"])
        return (lease["start_date"] != values["start_date"] or
                lease["end_date"] != values["end_date"] or
                old_charges != new_charges or old_concessions != new_concessions)

    @staticmethod
    def _validate(payload):
        if not isinstance(payload, dict): raise LeaseValidationError("A JSON object is required.")
        try:
            unit_id = int(payload.get("unitId", 0))
            start = date.fromisoformat(str(payload.get("startDate", "")))
            term = str(payload.get("termType", "Fixed"))
            end = (date(9999, 12, 31) if term == "Month-to-Month" else
                   date.fromisoformat(str(payload.get("endDate", ""))))
            participants = list(dict.fromkeys(int(x) for x in payload.get("participantIds", [])))
            primary = int(payload.get("primaryTenantId", 0))
        except (TypeError, ValueError):
            raise LeaseValidationError("Lease dates and identifiers are invalid.") from None
        if not unit_id: raise LeaseValidationError("Select a unit.")
        if term not in {"Fixed", "Month-to-Month"}:
            raise LeaseValidationError("Lease term type is invalid.")
        if end < start: raise LeaseValidationError("The lease end date cannot be before the start date.")
        if not participants: raise LeaseValidationError("Select at least one leaseholder.")
        if primary not in participants:
            raise LeaseValidationError("The primary leaseholder must be selected.")
        participants = [primary, *[item for item in participants if item != primary]]
        charges = []
        try:
            for item in payload.get("charges", []):
                amount = Decimal(str(item.get("amount", 0)))
                charge_type = str(item.get("chargeType", ""))
                if amount < 0 or charge_type not in CHARGE_TYPES: raise ValueError
                charges.append({"charge_type": charge_type,
                                "description": str(item.get("description", "")).strip() or charge_type,
                                "amount": amount})
            concessions = []
            for item in payload.get("concessions", []):
                amount = Decimal(str(item.get("amount", 0)))
                start_period, end_period = str(item.get("startPeriod", "")), str(item.get("endPeriod", ""))
                if (amount <= 0 or len(start_period) != 7 or len(end_period) != 7
                        or end_period < start_period): raise ValueError
                concessions.append({"id": int(item["id"]) if item.get("id") else None,
                                    "description": str(item.get("description", "")).strip() or "Lease concession",
                                    "amount": amount, "start_period": start_period,
                                    "end_period": end_period,
                                    "comment": str(item.get("comment", "")).strip()})
        except (InvalidOperation, TypeError, ValueError):
            raise LeaseValidationError("Charges or concessions are invalid.") from None
        rent = next((item for item in charges if item["charge_type"] == "Apartment Rent"), None)
        if not rent or rent["amount"] <= 0:
            raise LeaseValidationError("Apartment rent must be greater than zero.")
        status, renewal = str(payload.get("status", "")), str(payload.get("renewalStatus", "Not Started"))
        if status not in LEASE_STATUSES or renewal not in RENEWAL_STATUSES:
            raise LeaseValidationError("Lease or renewal status is invalid.")
        def optional_date(name):
            raw = str(payload.get(name, "")).strip()
            if not raw: return None
            try: return date.fromisoformat(raw)
            except ValueError:
                raise LeaseValidationError(f"{name} must be a valid date.") from None
        proposed_raw = payload.get("renewalProposedRent")
        try:
            proposed = None if proposed_raw in (None, "") else Decimal(str(proposed_raw))
            if proposed is not None and proposed <= 0: raise ValueError
        except (InvalidOperation, TypeError, ValueError):
            raise LeaseValidationError("Proposed renewal rent must be greater than zero.") from None
        return {"unit_id": unit_id, "previous_lease_id": None,
                "start_date": start, "end_date": end,
                "term_type": term, "status": status, "renewal_status": renewal,
                "renewal_proposed_rent": proposed,
                "renewal_letter_sent_date": optional_date("renewalLetterSentDate"),
                "renewal_response_date": optional_date("renewalResponseDate"),
                "renewal_notes": str(payload.get("renewalNotes", "")).strip(),
                "notes": str(payload.get("notes", "")).strip(),
                "participant_ids": participants, "charges": charges,
                "concessions": concessions}

    @staticmethod
    def _serialize(row: dict[str, Any], projection=False):
        month_to_month = row["term_type"] == "Month-to-Month"
        result = {"id": int(row["id"]), "unitId": int(row["unit_id"]),
                  "previousLeaseId": int(row["previous_lease_id"]) if row.get("previous_lease_id") else None,
                  "startDate": row["start_date"].isoformat(),
                  "endDate": "" if month_to_month else row["end_date"].isoformat(),
                  "termType": row["term_type"], "status": row["status"],
                  "renewalStatus": row["renewal_status"],
                  "renewalProposedRent": float(row["renewal_proposed_rent"]) if row.get("renewal_proposed_rent") is not None else None,
                  "renewalLetterSentDate": row["renewal_letter_sent_date"].isoformat() if row["renewal_letter_sent_date"] else "",
                  "renewalResponseDate": row["renewal_response_date"].isoformat() if row["renewal_response_date"] else "",
                  "renewalNotes": row["renewal_notes"], "notes": row["notes"]}
        if projection:
            apartment = row["civic_address"]
            if row["apartment_number"]: apartment += f" {row['apartment_number']}"
            result.update({"street": row["street"], "apartment": apartment,
                           "leaseholders": row["leaseholders"],
                           "monthlyTotal": float(row["monthly_total"])})
        if row.get("successor_lease_id"):
            result["successorLeaseId"] = int(row["successor_lease_id"])
        return result

    @staticmethod
    def _shift_period(period: str, months: int) -> str:
        year, month = map(int, period.split("-"))
        index = year * 12 + month - 1 + months
        return f"{index // 12:04d}-{index % 12 + 1:02d}"

    @staticmethod
    def _add_months(value: date, months: int) -> date:
        index = value.year * 12 + value.month - 1 + months
        year, month = index // 12, index % 12 + 1
        return date(year, month, min(value.day, monthrange(year, month)[1]))

    @staticmethod
    def _charge(row):
        return {"id": int(row["id"]), "leaseId": int(row["lease_id"]),
                "chargeType": row["charge_type"], "description": row["description"],
                "amount": float(row["amount"]), "frequency": row["frequency"],
                "startDate": row["start_date"].isoformat(),
                "endDate": "" if row["end_date"].year == 9999 else row["end_date"].isoformat()}

    @staticmethod
    def _concession(row):
        return {"id": int(row["id"]), "leaseId": int(row["lease_id"]),
                "description": row["description"], "amount": float(row["amount"]),
                "startPeriod": row["start_period"], "endPeriod": row["end_period"],
                "comment": row["comment"]}
