# Release Manifest

- Application version: 6.7.3
- REST API version: v1
- Database schema version: 2
- Source baseline: 6.7.2
- Package type: Delta

## Modified files

- `backend/property_manager/__init__.py`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/src/app/shell.ts`
- `frontend/src/repositories/apiClient.ts`
- `frontend/src/services/backupService.ts`
- `frontend/dist/index.html`
- Production JavaScript bundle in `frontend/dist/assets/`
- `README.md`
- `CHANGELOG.md`
- `DELTA_INSTALL.md`
- `RELEASE_MANIFEST.md`

## Apply and verify

Extract directly over Baseline 6.7.2 and restart Flask and Vite. No dependency
or database migration is required.

Sign in through the server portal and open PropertyManager at
`http://localhost/PropertyManager/`. Verify the browser requests
`/PropertyManager/api/v1/auth/session`, that Vite forwards it to Flask as
`/api/v1/auth/session`, and that the response is HTTP 200.
