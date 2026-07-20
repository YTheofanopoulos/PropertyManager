# Release Manifest

- Application version: **6.0.0.2**
- REST API version: **v1**
- Database schema version: **1**
- Package type: **Delta**
- Required baseline: **6.0.0**
- Archive layout: **Project-root-relative; no enclosing folder**
- Generated: **2026-07-20**

## Purpose

This delta adds and documents the coordinated development workflow for running the Python API and Vite frontend together, and standardizes release archives so they unpack directly into whichever baseline-named project directory the developer uses.

## Included paths

- `scripts/`
- `backend/.env.example`
- `backend/.env.migrate.example`
- `backend/property_manager/__init__.py`
- `frontend/vite.config.ts`
- `frontend/src/app/shell.ts`
- `frontend/src/services/backupService.ts`
- `docs/INSTALL.md`
- `docs/DeveloperWorkflow.md`
- `README.md`
- `CHANGELOG.md`
- `DELTA_INSTALL.md`
- `RELEASE_MANIFEST.md`

## Removed files

None.

## Post-install

```bash
chmod +x scripts/*.sh
./scripts/setup_dev.sh
./scripts/check_dev.sh
./scripts/start_dev.sh
```
