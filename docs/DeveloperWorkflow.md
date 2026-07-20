# Developer Workflow — Baseline 6.1.0

PropertyManager uses two development processes: the Vite frontend and the Python API. MariaDB normally runs continuously as an operating-system service. The helper scripts coordinate the frontend and backend for you.

## First-time setup

From the project root:

```bash
./scripts/setup_dev.sh
```

Edit the generated files:

- `backend/.env` — restricted runtime account
- `backend/.env.migrate` — schema/import account

The helper scripts parse these files with `python-dotenv`, not Bash. Quote values
that contain spaces or `#`; shell-special characters such as `$`, `!`, and
backticks remain literal. Do not add shell commands or `export` statements.

Then initialize the schema:

```bash
./scripts/init_database.sh
```

Optionally validate and import a Baseline 5.x JSON backup:

```bash
./scripts/import_5x_backup.sh /path/to/backup.json --dry-run
./scripts/import_5x_backup.sh /path/to/backup.json
```

Always run the dry run first. It validates relationships and converts every
field to its MariaDB parameter type without opening or changing the database.
During a live import, each collection reports its progress and record count.
If conversion fails, the diagnostic identifies the collection, row, JSON field,
Python type, and value. See `docs/IMPORTING_5X_BACKUPS.md` for examples and
troubleshooting guidance.

## Daily development

```bash
./scripts/start_dev.sh
```

Open `http://127.0.0.1:5173` locally. Vite listens on all network interfaces
and proxies requests beginning with `/api` to the Python backend at
`http://127.0.0.1:5000`. The backend itself remains available only locally.

The launcher starts the backend and frontend in separate process groups and
waits for both. Press `Ctrl+C` in the launcher terminal to send a coordinated
shutdown to both complete process trees. `SIGTERM` receives the same cleanup.
Flask's reloader is disabled under the launcher so it cannot leave a second
backend process running. If the launcher terminal was closed unexpectedly, run:

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

Vite binds to `0.0.0.0` automatically. From another device on the same trusted
network, browse to the development computer's LAN address with port 5173:

```text
http://192.168.1.25:5173
```

Replace the example address with the development computer's actual LAN IP.
Allow inbound TCP port 5173 through the development firewall if necessary.
Do not expose the Vite development server directly to the public internet. The
Python API remains bound to localhost and is reached only through Vite's `/api`
proxy.

## What npm does

`npm` manages only the frontend. It does not start Python or MariaDB. `start_dev.sh` starts npm/Vite and Python together, while MariaDB continues as a system service.

## Verifying the Units REST migration

Open the browser developer tools, select the Network panel, and visit Units. The page must issue `GET /api/v1/units`. Adding, editing, or deleting an eligible unit uses the matching API v1 endpoint. Other pages should not begin making entity API requests in this baseline because their repositories remain on IndexedDB.

If the Units request fails, the table remains usable as an empty table and a visible error explains that the backend could not be reached. Check `/api/v1/system/health`, the backend log, and the Vite `/api` proxy before changing browser data.
