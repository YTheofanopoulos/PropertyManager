# Release Manifest

- Application version: 6.0.0.6
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.0.0.5
- Package type: Delta

## Modified files

- `scripts/verify_database.py`
- `CHANGELOG.md`
- `RELEASE_MANIFEST.md`
- `docs/INSTALL.md`

## Added files

- None

## Removed files

- None

## Apply

Extract the archive directly into the root of an existing Baseline 6.0.0.5
project directory. The archive intentionally has no enclosing project folder.

No database schema migration or frontend rebuild is required.

Primary installation guide: `docs/INSTALL.md`
