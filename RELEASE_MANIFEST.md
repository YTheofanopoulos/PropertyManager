# Release Manifest

- Application version: 6.7.0
- REST API version: v1
- Database schema version: 2
- Source baseline: 6.6.2.1
- Package type: Delta

## Added files

- `backend/property_manager/routes/auth.py`
- `backend/property_manager/security/__init__.py`
- `backend/property_manager/security/middleware.py`
- `backend/property_manager/security/shared_auth_adapter.py`
- `backend/tests/test_auth_security.py`
- `frontend/src/features/auth/loginPage.ts`
- `frontend/src/services/authService.ts`
- `frontend/src/services/authSession.ts`
- `docs/AUTHENTICATION.md`

## Modified files

- `backend/.env.example`
- `backend/property_manager/__init__.py`
- `backend/property_manager/app_factory.py`
- `backend/property_manager/config.py`
- `backend/property_manager/routes/__init__.py`
- `backend/requirements.txt`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/shell.ts`
- `frontend/src/main.ts`
- `frontend/src/repositories/apiClient.ts`
- `frontend/src/services/backupService.ts`
- `frontend/src/styles/app.css`
- `frontend/dist/index.html`
- Production CSS and JavaScript bundles in `frontend/dist/assets/`
- `scripts/check_dev.sh`
- `README.md`
- `CHANGELOG.md`
- `DELTA_INSTALL.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DeveloperWorkflow.md`
- `docs/INSTALL.md`
- `RELEASE_MANIFEST.md`

## SharedAuth source usage

No file from the supplied `login` directory is copied into this delta.
PropertyManager loads `mongoclass.py` and
`shared_auth/{__init__,backend,models,service}.py` at runtime through
`PM_AUTH_PATH`. `login.py` and the existing `src/py` callers were reviewed to
preserve their contract but are not copied or imported.
See `docs/AUTHENTICATION.md` for the exact inventory and responsibilities.

## Apply and verify

Extract directly over Baseline 6.6.2.1, run `setup_dev.sh`, configure
SharedAuth, and restart both services. No MariaDB migration is required.

Verify login, remembered and session-only storage, current-user display,
scope denial, read/write authorization, expired-token handling, and logout.
Then run the existing lease-renewal and manual-reconciliation regressions.

The prior generated bundles from Baseline 6.6.2.1 are obsolete after the
update and may be removed if they remain in the target directory.
