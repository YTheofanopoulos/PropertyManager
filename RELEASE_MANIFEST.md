# Release Manifest

- Application version: 6.2.0.1
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.2.0
- Package type: Delta

## Modified files

- `backend/property_manager/__init__.py`
- `backend/property_manager/services/unit_service.py`
- `backend/tests/test_unit_service.py`
- `frontend/src/app/shell.ts`
- `frontend/src/services/backupService.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/INSTALL.md`
- `RELEASE_MANIFEST.md`

## Added files

- None

## Removed files

- None

## Apply

Extract the archive directly into the root of an existing Baseline 6.2.0 project directory. The archive intentionally has no enclosing project folder.

No database schema migration is required. Rebuild the frontend, restart the development services, and verify that `POST /api/v1/units` returns `201`.
