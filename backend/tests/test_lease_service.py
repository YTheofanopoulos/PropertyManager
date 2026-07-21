from __future__ import annotations

import unittest
from contextlib import contextmanager
from datetime import date
from decimal import Decimal
from unittest.mock import patch
from property_manager.services.lease_service import LeaseService, LeaseValidationError


class FakeLeaseRepository:
    lease = {"id": 1, "unit_id": 2, "previous_lease_id": None,
             "start_date": date(2026, 7, 1), "end_date": date(2027, 6, 30),
             "term_type": "Fixed", "status": "Active", "renewal_status": "Accepted",
             "renewal_proposed_rent": Decimal("1260"),
             "renewal_letter_sent_date": date(2027, 1, 15),
             "renewal_response_date": date(2027, 2, 1), "renewal_notes": "Accepted",
             "notes": "Carry forward", "successor_lease_id": None}

    def list_leases(self):
        return [{"id": 1, "unit_id": 2, "start_date": date(2026, 7, 1),
                 "end_date": date(2027, 6, 30), "term_type": "Fixed",
                 "status": "Active", "renewal_status": "Not Started",
                 "renewal_letter_sent_date": None, "renewal_response_date": None,
                 "renewal_notes": "", "notes": "", "street": "Clermont",
                 "civic_address": "116", "apartment_number": "",
                 "leaseholders": ["Jane Doe"], "monthly_total": Decimal("1200") }]

    def get_with_successor(self, lease_id):
        return self.lease if lease_id == 1 else None

    def get_related(self, table, lease_id):
        if table == "lease_participants":
            return [{"id": 4, "lease_id": 1, "tenant_id": 9,
                     "is_primary": True, "sort_order": 0}]
        if table == "recurring_charges":
            return [{"id": 7, "lease_id": 1, "charge_type": "Apartment Rent",
                     "description": "Rent", "amount": Decimal("1200"),
                     "frequency": "Monthly", "start_date": date(2026, 7, 1),
                     "end_date": date(2027, 6, 30)}]
        return []

    def history(self, lease_id):
        return [{**self.lease, "monthly_total": Decimal("1200")}]


class FakeRenewalRepository:
    def __init__(self):
        self.source = dict(FakeLeaseRepository.lease)
        self.created = None
        self.completed = False

    def get_by_id(self, lease_id):
        return self.source if lease_id == 1 else self.created

    def get_with_successor(self, lease_id):
        row = self.get_by_id(lease_id)
        return {**row, "successor_lease_id": None} if row else None

    def successor_id(self, connection, lease_id): return None
    def next_id(self, connection, table): return 2 if table == "leases" else 20
    def exists(self, connection, table, row_id): return True
    def overlapping_unit(self, *args): return None
    def overlapping_tenant(self, *args): return None
    def related(self, *args): return []
    def concessions(self, *args): return []
    def obligations(self, *args): return []
    def replace_participants(self, *args): pass
    def replace_charges(self, *args): pass
    def sync_concessions(self, *args): pass
    def refresh_unit(self, *args): pass

    def upsert_lease(self, connection, lease_id, values, creating):
        self.created = {"id": lease_id, **values,
                        "unit_id": values["unit_id"], "start_date": values["start_date"],
                        "end_date": values["end_date"], "term_type": values["term_type"],
                        "status": values["status"], "renewal_status": values["renewal_status"],
                        "renewal_proposed_rent": values["renewal_proposed_rent"],
                        "renewal_letter_sent_date": None, "renewal_response_date": None,
                        "renewal_notes": "", "notes": values["notes"]}

    def complete_renewal(self, connection, lease_id):
        self.completed = True


class LeaseServiceTests(unittest.TestCase):
    def test_list_projection(self):
        rows = LeaseService(FakeLeaseRepository()).list_leases()
        self.assertEqual(rows[0]["apartment"], "116")
        self.assertEqual(rows[0]["monthlyTotal"], 1200.0)

    def test_primary_tenant_must_be_selected(self):
        with self.assertRaises(LeaseValidationError):
            LeaseService._validate({"unitId": 2, "startDate": "2026-07-01",
                "endDate": "2027-06-30", "termType": "Fixed", "status": "Active",
                "renewalStatus": "Not Started", "participantIds": [1],
                "primaryTenantId": 9, "charges": [{"chargeType": "Apartment Rent",
                "description": "Rent", "amount": 1200}], "concessions": []})

    def test_accepted_renewal_draft_carries_terms_and_proposed_rent(self):
        draft = LeaseService(FakeLeaseRepository()).renewal_draft(1)
        self.assertEqual(draft["renewal"]["startDate"], "2027-07-01")
        self.assertEqual(draft["renewal"]["endDate"], "2028-06-30")
        self.assertEqual(draft["renewal"]["participantIds"], [9])
        self.assertEqual(draft["renewal"]["charges"][0]["amount"], 1260.0)
        self.assertEqual(draft["currentRent"], 1200.0)

    def test_accepted_status_and_proposed_rent_validate(self):
        values = LeaseService._validate({"unitId": 2, "startDate": "2027-07-01",
            "endDate": "2028-06-30", "termType": "Fixed", "status": "Future",
            "renewalStatus": "Accepted", "renewalProposedRent": 1260,
            "participantIds": [9], "primaryTenantId": 9,
            "charges": [{"chargeType": "Apartment Rent", "description": "Rent",
                         "amount": 1260}], "concessions": []})
        self.assertEqual(values["renewal_status"], "Accepted")
        self.assertEqual(values["renewal_proposed_rent"], Decimal("1260"))

    def test_create_renewal_links_successor_and_completes_source(self):
        repository = FakeRenewalRepository()

        @contextmanager
        def fake_transaction():
            yield object()

        payload = {"unitId": 2, "startDate": "2027-07-01",
            "endDate": "2028-06-30", "termType": "Fixed", "status": "Future",
            "renewalStatus": "Not Started", "participantIds": [9],
            "primaryTenantId": 9, "charges": [{"chargeType": "Apartment Rent",
            "description": "Rent", "amount": 1260}], "concessions": [], "notes": ""}
        with patch("property_manager.services.lease_service.transaction", fake_transaction):
            created = LeaseService(repository).create_renewal(1, payload)
        self.assertEqual(created["previousLeaseId"], 1)
        self.assertTrue(repository.completed)


if __name__ == "__main__": unittest.main()
