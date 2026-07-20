# Release Manifest

- Application version: 6.3.0
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.2.0.1
- Package type: Delta

## Added files

- `backend/property_manager/repositories/tenant_repository.py`
- `backend/property_manager/repositories/lease_repository.py`
- `backend/property_manager/routes/tenants.py`
- `backend/property_manager/routes/leases.py`
- `backend/property_manager/services/tenant_service.py`
- `backend/property_manager/services/lease_service.py`
- `backend/tests/test_tenant_service.py`
- `backend/tests/test_lease_service.py`

## Modified files

- `backend/property_manager/__init__.py`
- `backend/property_manager/app_factory.py`
- `backend/property_manager/routes/__init__.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/shell.ts`
- `frontend/src/features/tenants/page.ts`
- `frontend/src/features/leases/page.ts`
- `frontend/src/features/leases/editor.ts`
- `frontend/src/repositories/tenantRepository.ts`
- `frontend/src/repositories/leaseRepository.ts`
- `frontend/src/repositories/repositoryConfiguration.ts`
- `frontend/src/services/tenantService.ts`
- `frontend/src/services/leaseService.ts`
- `frontend/src/services/unitService.ts`
- `frontend/src/services/backupService.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DeveloperWorkflow.md`
- `docs/INSTALL.md`
- `RELEASE_MANIFEST.md`

## Removed files

- None

## Apply

Extract directly into an existing Baseline 6.2.0.1 project root. No database migration is required. Rebuild the frontend and restart both development services.

Verify Tenant CRUD and deletion safeguards, then test Lease list/create/edit/terminate, participant changes, recurring charges, concessions, overlap rejection, allocated-payment safeguards, and occupancy updates.
