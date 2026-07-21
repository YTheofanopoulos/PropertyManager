# Release Manifest

- Application version: 6.6.0
- REST API version: v1
- Database schema version: 2
- Source baseline: v6.5.0
- Package type: Delta

## Added files

- `database/migrations/002_lease_renewals.sql`

## Modified areas

- Lease repository, service, routes, and regression tests
- Lease frontend domain models, API repository/service, router, list, and editor
- Application/schema version metadata
- README, changelog, installation, architecture, API, database, and developer documentation
- Rebuilt `frontend/dist`

## Obsolete generated file

- `frontend/dist/assets/index-Gaj9DWD2.js` is replaced by the new hashed production bundle. It is harmless if retained after extracting the delta, but may be removed.

## Apply and verify

Extract directly over Baseline 6.5.0, run `./scripts/setup_dev.sh`, then apply Schema 2 with `./scripts/init_database.sh`. Restart the development services and confirm `/api/v1/system/health` reports application 6.6.0 and schema 2.

Verify an accepted renewal can be started from both the lease list and editor, that copied values remain editable, the rent comparison is correct, overlap conflicts are rejected, the source lease remains unchanged, and exactly one linked successor can be created.
