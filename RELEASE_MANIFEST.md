# Release Manifest

- Application version: 6.4.0
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.3.0
- Package type: Delta

## Added files

- `backend/property_manager/repositories/financial_repository.py`
- `backend/property_manager/routes/financial.py`
- `backend/property_manager/services/financial_service.py`
- `backend/tests/test_financial_service.py`

## Modified files

- `backend/property_manager/__init__.py`
- `backend/property_manager/app_factory.py`
- `backend/property_manager/routes/__init__.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/shell.ts`
- `frontend/src/features/payments/page.ts`
- `frontend/src/features/credits/page.ts`
- `frontend/src/features/rentRoll/page.ts`
- `frontend/src/features/rentStatus/page.ts`
- `frontend/src/repositories/repositoryConfiguration.ts`
- `frontend/src/services/backupService.ts`
- `frontend/src/services/creditService.ts`
- `frontend/src/services/paymentService.ts`
- `frontend/src/services/rentLedgerService.ts`
- `frontend/src/services/rentStatusService.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DeveloperWorkflow.md`
- `docs/INSTALL.md`
- `RELEASE_MANIFEST.md`

## Removed files

- None

## Apply and verify

Extract directly over a validated Baseline 6.3.0 project root. No database migration is required. Rebuild the frontend and restart both development services.

Verify payment list/create/void, partial and multi-period allocations, unapplied credits, credit application, Rent Roll period selection, Rent Status details, and protection against over-allocation. Bank Import, Reconciliation, Dashboard calculations, Payment Receipt reports, and other reports remain IndexedDB-backed.
