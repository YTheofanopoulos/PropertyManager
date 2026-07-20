# Release Manifest

- Application version: 6.5.0
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.4.0.1
- Package type: Delta

## Added files

- `backend/property_manager/repositories/bank_repository.py`
- `backend/property_manager/routes/bank.py`
- `backend/property_manager/services/bank_service.py`
- `backend/tests/test_bank_service.py`
- `frontend/src/services/financialContextService.ts`

## Modified files

- `backend/property_manager/__init__.py`
- `backend/property_manager/app_factory.py`
- `backend/property_manager/repositories/financial_repository.py`
- `backend/property_manager/routes/__init__.py`
- `backend/property_manager/routes/financial.py`
- `backend/property_manager/services/financial_service.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/shell.ts`
- `frontend/src/features/bankImport/page.ts`
- `frontend/src/features/dashboard/page.ts`
- `frontend/src/repositories/repositoryConfiguration.ts`
- `frontend/src/services/backupService.ts`
- `frontend/src/services/bankImportService.ts`
- `frontend/src/services/dashboardService.ts`
- `frontend/src/services/paymentReceiptReportService.ts`
- `frontend/src/services/reconciliationService.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DeveloperWorkflow.md`
- `docs/INSTALL.md`
- `RELEASE_MANIFEST.md`

## Apply and verify

Extract directly over Baseline 6.4.0.1, rebuild the frontend, and restart both development services. No database migration is required.

Verify Payment Receipts and XLSX export, dashboard totals/charts/renewals, QFX preview and duplicate detection, import commit, queue filters, suggestions, ignore, reconciliation allocations, payment creation, and void/reopen behavior. Browser backup/restore and sample reset remain legacy IndexedDB utilities and do not modify MariaDB.
