# PropertyManager Baseline 6.2.0.1

PropertyManager is transitioning from the Baseline 5 browser-only application to a Python/MariaDB client-server architecture.

Version identifiers:

- Application: **6.2.0.1**
- REST API: **v1**
- Database schema: **1**

Baseline 6.2.0.1 makes Locations, Buildings, and Units live REST-backed domains and corrects Unit creation through API v1. Their list projections and editors use MariaDB; every other application domain continues to use its established IndexedDB repository.

Start with [docs/INSTALL.md](docs/INSTALL.md).

The repository selection is deliberately explicit in `frontend/src/repositories/repositoryConfiguration.ts`. Only `locations`, `buildings`, and `units` are set to `api`; no other frontend repository was migrated in this baseline.

## Development quick start

```bash
./scripts/setup_dev.sh
# Configure backend/.env and backend/.env.migrate
./scripts/init_database.sh
./scripts/start_dev.sh
```

The launcher starts the Python API and Vite frontend together. Open `http://127.0.0.1:5173` and press `Ctrl+C` to stop both. See `docs/DeveloperWorkflow.md`.
