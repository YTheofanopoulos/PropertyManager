from __future__ import annotations

from typing import Any

from ..database import transaction
from ..repositories.tenant_repository import TenantRepository


class TenantValidationError(ValueError): pass
class TenantNotFoundError(LookupError): pass
class TenantConflictError(RuntimeError): pass


class TenantService:
    def __init__(self, repository=None):
        self.repository = repository or TenantRepository()

    def list_tenants(self):
        return [self._serialize(row, True) for row in self.repository.list_tenants()]

    def get_tenant(self, tenant_id):
        row = self.repository.get_by_id(tenant_id)
        if row is None: raise TenantNotFoundError("Tenant not found.")
        return self._serialize(row)

    def create_tenant(self, payload):
        values = self._validate(payload)
        with transaction() as connection:
            if self.repository.find_email(connection, values["email"]):
                raise TenantConflictError("A tenant with that email already exists.")
            tenant_id = self.repository.next_id(connection)
            self.repository.insert(connection, tenant_id, values)
        return self.get_tenant(tenant_id)

    def update_tenant(self, tenant_id, payload):
        values = self._validate(payload)
        with transaction() as connection:
            if not self.repository.exists(connection, tenant_id):
                raise TenantNotFoundError("Tenant not found.")
            if self.repository.find_email(connection, values["email"], tenant_id):
                raise TenantConflictError("A tenant with that email already exists.")
            self.repository.update(connection, tenant_id, values)
        return self.get_tenant(tenant_id)

    def delete_tenant(self, tenant_id):
        with transaction() as connection:
            if not self.repository.exists(connection, tenant_id):
                raise TenantNotFoundError("Tenant not found.")
            if self.repository.has_leases(connection, tenant_id):
                raise TenantConflictError(
                    "A leaseholder cannot be deleted. Mark the tenant inactive instead."
                )
            self.repository.delete(connection, tenant_id)

    @staticmethod
    def _validate(payload):
        if not isinstance(payload, dict):
            raise TenantValidationError("A JSON object is required.")
        first = str(payload.get("firstName", "")).strip()
        last = str(payload.get("lastName", "")).strip()
        email = str(payload.get("email", "")).strip()
        if not first or not last:
            raise TenantValidationError("First and last name are required.")
        if "@" not in email:
            raise TenantValidationError("Enter a valid email address.")
        return {"first_name": first, "last_name": last, "email": email,
                "phone": str(payload.get("phone", "")).strip(),
                "active": bool(payload.get("active", True))}

    @staticmethod
    def _serialize(row: dict[str, Any], projection=False):
        result = {"id": int(row["id"]), "firstName": row["first_name"],
                  "lastName": row["last_name"], "email": row["email"],
                  "phone": row["phone"], "active": bool(row["active"])}
        if projection:
            result.update({"apartments": row["apartments"],
                           "primaryLeaseCount": int(row["primary_lease_count"])})
        return result
