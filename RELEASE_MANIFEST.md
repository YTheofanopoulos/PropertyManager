# Release Manifest

- Application version: 6.6.1
- REST API version: v1
- Database schema version: 2
- Source baseline: 6.6.0
- Package type: Delta

## Modified files

- `backend/property_manager/__init__.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/shell.ts`
- `frontend/src/features/bankImport/page.ts`
- `frontend/src/services/backupService.ts`
- `frontend/dist/index.html`
- Production JavaScript bundle in `frontend/dist/assets/`
- `README.md`
- `CHANGELOG.md`
- `DELTA_INSTALL.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DeveloperWorkflow.md`
- `docs/INSTALL.md`
- `RELEASE_MANIFEST.md`

## Apply and verify

Extract directly over Baseline 6.6.0, refresh dependencies, and restart both services. No database migration is required.

Verify a transaction whose correct unit is absent from Suggested Units can use **Select Unit Manually**, find the unit by address/apartment/tenant, load its outstanding obligations, allocate the payment, and reconcile successfully.

The prior generated bundle `frontend/dist/assets/index-BzY8quCP.js` is obsolete after the update and may be removed if it remains in the target directory.
