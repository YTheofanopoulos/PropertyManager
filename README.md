# PropertyManager Baseline 6.7.1

PropertyManager is transitioning from the Baseline 5 browser-only application to a Python/MariaDB client-server architecture.

Version identifiers:

- Application: **6.7.1**
- REST API: **v1**
- Database schema: **2**

Baseline 6.7.1 integrates with the existing server portal and SharedAuth
token-verification mechanism. PropertyManager uses the token created when the
user signs in at the server's main page; it does not display a second login
screen. Every API transaction remains authenticated and authorization uses the
configurable `propertymanager` scope.

PropertyManager and the portal must be served from the same origin so the
frontend can read the portal token from browser storage. If the token is
missing, expired, invalid, or lacks PropertyManager access, the browser returns
to `/`. Set `VITE_PORTAL_URL` at frontend build time only when the portal uses a
different same-origin path.

Before starting 6.6.0, apply database migration `002_lease_renewals.sql` with `./scripts/init_database.sh`.

Start with [docs/INSTALL.md](docs/INSTALL.md).

The repository selection is explicit in `frontend/src/repositories/repositoryConfiguration.ts`. Locations, Buildings, Units, Tenants, and Leases are set to `api`; other domains remain unchanged.

## Development quick start

```bash
./scripts/setup_dev.sh
# Configure MariaDB and SharedAuth in backend/.env
./scripts/init_database.sh
./scripts/start_dev.sh
```

The launcher starts the Python API and Vite frontend together. Open `http://127.0.0.1:5173` and press `Ctrl+C` to stop both. See `docs/DeveloperWorkflow.md`.

SharedAuth integration and the exact source-file inventory are documented in [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).
