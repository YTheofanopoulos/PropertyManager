# Release Manifest

- Application version: 6.1.0
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.0.0.7
- Package type: Delta

## Added files

- `backend/property_manager/repositories/unit_repository.py`
- `backend/property_manager/routes/units.py`
- `backend/property_manager/services/unit_service.py`
- `backend/tests/test_unit_service.py`
- `frontend/src/repositories/apiClient.ts`
- `frontend/src/repositories/repositoryConfiguration.ts`

## Modified files

- `backend/property_manager/__init__.py`
- `backend/property_manager/app_factory.py`
- `backend/property_manager/routes/__init__.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/shell.ts`
- `frontend/src/features/units/page.ts`
- `frontend/src/repositories/unitRepository.ts`
- `frontend/src/services/backupService.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DeveloperWorkflow.md`
- `RELEASE_MANIFEST.md`

## Removed files

- None

## Apply

Extract the archive directly into the root of an existing Baseline 6.0.0.7 project directory. The archive intentionally has no enclosing project folder.

No database schema migration is required. Rebuild the frontend after applying the source delta:

```bash
cd frontend
npm install
npm run build
```

Then run `./scripts/start_dev.sh` and verify that visiting Units produces `GET /api/v1/units` in the browser Network panel.
