# PropertyManager Baseline 6.5.0

PropertyManager is transitioning from the Baseline 5 browser-only application to a Python/MariaDB client-server architecture.

Version identifiers:

- Application: **6.5.0**
- REST API: **v1**
- Database schema: **1**

Baseline 6.5.0 makes every operational screen MariaDB-backed: Locations, Buildings, Units, Tenants, Leases, Payments, Allocations, Credits, Rent Roll, Rent Status, Payment Receipts, Bank Statement Import/Reconciliation, and Dashboard calculations. Browser backup/restore and sample-data reset remain explicitly legacy IndexedDB utilities.

Start with [docs/INSTALL.md](docs/INSTALL.md).

The repository selection is explicit in `frontend/src/repositories/repositoryConfiguration.ts`. Locations, Buildings, Units, Tenants, and Leases are set to `api`; other domains remain unchanged.

## Development quick start

```bash
./scripts/setup_dev.sh
# Configure backend/.env and backend/.env.migrate
./scripts/init_database.sh
./scripts/start_dev.sh
```

The launcher starts the Python API and Vite frontend together. Open `http://127.0.0.1:5173` and press `Ctrl+C` to stop both. See `docs/DeveloperWorkflow.md`.
