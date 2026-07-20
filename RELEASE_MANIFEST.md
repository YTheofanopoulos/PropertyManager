# Release Manifest

- Application version: 6.4.0.1
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.4.0
- Package type: Delta

## Modified files

- `backend/property_manager/__init__.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/shell.ts`
- `frontend/src/services/backupService.ts`
- `README.md`
- `CHANGELOG.md`
- `RELEASE_MANIFEST.md`

## Apply and verify

Extract directly over Baseline 6.4.0, rebuild the frontend, and restart both development services. No database migration is required.

Confirm the header shows Baseline 6.4.0.1 and MariaDB Schema 1. Open About and confirm Application Version/Baseline 6.4.0.1, REST API v1, the live database name/server version, MariaDB Schema 1, and Legacy Browser Schema 9.
