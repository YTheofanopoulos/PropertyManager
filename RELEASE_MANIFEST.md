# Release Manifest

- Application version: 6.6.2.1
- REST API version: v1
- Database schema version: 2
- Source baseline: 6.6.2
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
- `docs/ARCHITECTURE.md`
- `docs/DeveloperWorkflow.md`
- `docs/INSTALL.md`
- `RELEASE_MANIFEST.md`

## Apply and verify

Extract directly over Baseline 6.6.2, refresh dependencies, and restart both services. No database migration is required.

Open **Reconcile** from the bank-import queue. Verify **Unit Receiving This Payment** appears above Suggested Units, **Change Unit** expands the searchable picker inline, and either a suggested or searched unit updates the allocations before confirmation.

The prior generated bundle from Baseline 6.6.2 is obsolete after the update and may be removed if it remains in the target directory.
