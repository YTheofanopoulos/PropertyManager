# Release Manifest

- Application version: 6.0.0.7
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.0.0.6
- Package type: Delta

## Modified files

- `frontend/vite.config.ts`
- `backend/app.py`
- `scripts/start_dev.sh`
- `scripts/stop_dev.sh`
- `CHANGELOG.md`
- `RELEASE_MANIFEST.md`
- `docs/INSTALL.md`
- `docs/DeveloperWorkflow.md`

## Added files

- None

## Removed files

- None

## Apply

Extract the archive directly into the root of an existing Baseline 6.0.0.6
project directory. The archive intentionally has no enclosing project folder.

No database schema migration or frontend rebuild is required.

Primary installation guide: `docs/INSTALL.md`
