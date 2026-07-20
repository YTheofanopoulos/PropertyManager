from __future__ import annotations

import unittest
from property_manager.services.tenant_service import TenantService, TenantValidationError


class FakeTenantRepository:
    def list_tenants(self):
        return [{"id": 1, "first_name": "Jane", "last_name": "Doe",
                 "email": "jane@example.com", "phone": "555-0100", "active": 1,
                 "apartments": ["383 1 Edouard-Charles"],
                 "primary_lease_count": 1}]


class TenantServiceTests(unittest.TestCase):
    def test_list_projection(self):
        rows = TenantService(FakeTenantRepository()).list_tenants()
        self.assertEqual(rows[0]["firstName"], "Jane")
        self.assertEqual(rows[0]["primaryLeaseCount"], 1)

    def test_invalid_email(self):
        with self.assertRaises(TenantValidationError):
            TenantService._validate({"firstName": "Jane", "lastName": "Doe",
                                     "email": "invalid"})


if __name__ == "__main__": unittest.main()
