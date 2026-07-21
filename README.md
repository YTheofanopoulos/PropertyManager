# PropertyManager Baseline 6.6.0

PropertyManager is transitioning from the Baseline 5 browser-only application to a Python/MariaDB client-server architecture.

Version identifiers:

- Application: **6.6.0**
- REST API: **v1**
- Database schema: **2**

Baseline 6.6.0 adds a transactional lease-renewal workflow. Accepted renewals can create an editable successor lease with copied participants and financial terms, intelligent term defaults, overlap validation, and linked lease history. Every operational screen remains MariaDB-backed.

Before starting 6.6.0, apply database migration `002_lease_renewals.sql` with `./scripts/init_database.sh`.

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
