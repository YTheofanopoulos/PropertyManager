from __future__ import annotations

import unittest
from datetime import date
from decimal import Decimal
from property_manager.services.lease_service import LeaseService, LeaseValidationError


class FakeLeaseRepository:
    def list_leases(self):
        return [{"id": 1, "unit_id": 2, "start_date": date(2026, 7, 1),
                 "end_date": date(2027, 6, 30), "term_type": "Fixed",
                 "status": "Active", "renewal_status": "Not Started",
                 "renewal_letter_sent_date": None, "renewal_response_date": None,
                 "renewal_notes": "", "notes": "", "street": "Clermont",
                 "civic_address": "116", "apartment_number": "",
                 "leaseholders": ["Jane Doe"], "monthly_total": Decimal("1200") }]


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


if __name__ == "__main__": unittest.main()
