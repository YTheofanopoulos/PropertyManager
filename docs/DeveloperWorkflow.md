# Developer Workflow — Baseline 6.0.0.2

PropertyManager uses two development processes: the Vite frontend and the Python API. MariaDB normally runs continuously as an operating-system service. The helper scripts coordinate the frontend and backend for you.

## First-time setup

From the project root:

```bash
./scripts/setup_dev.sh
```

Edit the generated files:

- `backend/.env` — restricted runtime account
- `backend/.env.migrate` — schema/import account

Then initialize the schema:

```bash
./scripts/init_database.sh
```

Optionally validate and import a Baseline 5.x JSON backup:

```bash
./scripts/import_5x_backup.sh /path/to/backup.json --dry-run
./scripts/import_5x_backup.sh /path/to/backup.json
```

## Daily development

```bash
./scripts/start_dev.sh
```

Open `http://127.0.0.1:5173`. Vite proxies requests beginning with `/api` to the Python backend at `http://127.0.0.1:5000`.

Press `Ctrl+C` in the launcher terminal to stop both processes. If that terminal was closed unexpectedly, run:

```bash
./scripts/stop_dev.sh
```

## Health checks

```bash
./scripts/check_dev.sh
```

This verifies tools, dependencies, configuration, ports, database connectivity, schema version, and table counts.

## Database utilities

```bash
./scripts/verify_database.sh
./scripts/backup_database.sh
./scripts/backup_database.sh /secure/path/backup.sql
./scripts/restore_database.sh /secure/path/backup.sql
```

The restore script deliberately requires the migration credentials and an explicit `RESTORE` confirmation.

## LAN testing

The launcher binds Vite to localhost by default. To test from another computer:

```bash
PM_DEV_HOST=0.0.0.0 ./scripts/start_dev.sh
```

Use the development computer's LAN IP with port 5173. The Python API remains bound to localhost and is reached through the Vite proxy.

## What npm does

`npm` manages only the frontend. It does not start Python or MariaDB. `start_dev.sh` starts npm/Vite and Python together, while MariaDB continues as a system service.
