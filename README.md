# PropertyManager Deployment Kit 1.1.2 — Baseline 6.6.2.1

For a complete production-style local VM deployment:

```bash
sudo ./deployment/deploy.sh local
```

Open `http://localhost/PropertyManager`.

For production:

```bash
sudo PROPERTYMANAGER_SERVER_NAME=server.example.com \
  ./deployment/deploy.sh production
```

Open `https://server.example.com/PropertyManager`.

See `docs/DEPLOYMENT_KIT.md` for configuration, cleanup, upgrades, and diagnostics.

PropertyManager is transitioning from the Baseline 5 browser-only application to a Python/MariaDB client-server architecture.

Version identifiers:

- Application: **6.6.2.1**
- REST API: **v1**
- Database schema: **2**

Baseline 6.6.2.1 places the explicit **Unit Receiving This Payment** selection in the bank-import reconciliation dialog used by the normal workflow. The user can choose or change the unit before confirming the allocation.

Before starting 6.6.0, apply database migration `002_lease_renewals.sql` with `./scripts/init_database.sh`.

Start with [docs/INSTALL.md](docs/INSTALL.md).

For production packaging and automated Apache deployment, see [PropertyManager Deployment Kit 1.1.2](docs/DEPLOYMENT_KIT.md).

The repository selection is explicit in `frontend/src/repositories/repositoryConfiguration.ts`. Locations, Buildings, Units, Tenants, and Leases are set to `api`; other domains remain unchanged.

## Development quick start

```bash
./scripts/setup_dev.sh
# Configure backend/.env and backend/.env.migrate
./scripts/init_database.sh
./scripts/start_dev.sh
```

The launcher starts the Python API and Vite frontend together. Open `http://127.0.0.1:5173` and press `Ctrl+C` to stop both. See `docs/DeveloperWorkflow.md`.
