# PropertyManager Baseline 6.0.0.2 Installation

Baseline 6.0.0.2 includes the 6.0.0 foundation and adds a coordinated development workflow. Baseline 6.0.0 establishes the Python/MariaDB backend, database schema 1, API v1, migration tooling, and the official 5.x JSON importer. The existing 5.8 user interface is included and remains operational while the REST conversion proceeds in later 6.0.x milestones.

## 1. Requirements

Recommended production platform:

- Ubuntu or Debian Linux
- MariaDB 10.6 or newer
- Python 3.12 or 3.13 recommended
- Node.js 20 or newer and npm
- Apache 2.4 with `mod_proxy` and `mod_proxy_http`, or another reverse proxy

Python 3.14 may work, but third-party binary packages can lag behind new Python releases. Use 3.12 or 3.13 for the most predictable deployment.

## Development quick start

During development, MariaDB runs as a system service while one helper script starts both application processes:

```text
Browser → Vite (5173) → /api proxy → Python (5000) → MariaDB
```

After installing the operating-system prerequisites and creating the MariaDB accounts:

```bash
./scripts/setup_dev.sh
# Edit backend/.env and backend/.env.migrate
./scripts/init_database.sh
./scripts/import_5x_backup.sh /path/to/backup.json --dry-run
./scripts/import_5x_backup.sh /path/to/backup.json
./scripts/start_dev.sh
```

For ordinary daily testing, only `./scripts/start_dev.sh` is needed. Press `Ctrl+C` to stop both Vite and Python. See `docs/DeveloperWorkflow.md` for details.

## 2. Install operating-system packages

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y \
  mariadb-server mariadb-client \
  libmariadb-dev libmariadb-dev-compat \
  python3 python3-venv python3-dev build-essential \
  nodejs npm apache2
```

Verify MariaDB:

```bash
sudo systemctl enable --now mariadb
sudo mariadb -e "SELECT VERSION();"
```

## 3. Create the database and accounts

Do not use the MariaDB `root` account from the application.

Open the administrative client:

```bash
sudo mariadb
```

Run the following, replacing both passwords:

```sql
CREATE DATABASE IF NOT EXISTS property_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'propertymanager_app'@'localhost'
  IDENTIFIED BY 'LONG_RANDOM_APPLICATION_PASSWORD';

CREATE USER IF NOT EXISTS 'propertymanager_migrate'@'localhost'
  IDENTIFIED BY 'DIFFERENT_LONG_RANDOM_MIGRATION_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON property_manager.*
  TO 'propertymanager_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, INDEX, DROP,
      CREATE VIEW, SHOW VIEW, TRIGGER
  ON property_manager.*
  TO 'propertymanager_migrate'@'localhost';
```

The application account cannot create or drop tables. The migration account is used only for schema installation and controlled imports.

Confirm:

```sql
SHOW GRANTS FOR 'propertymanager_app'@'localhost';
SHOW GRANTS FOR 'propertymanager_migrate'@'localhost';
```

A copy of these commands is provided as:

```text
database/create_database_and_users.sql.example
```

## 4. Extract and prepare the project

```bash
sudo mkdir -p /opt/propertymanager
sudo chown "$USER":"$USER" /opt/propertymanager
unzip PropertyManager_Baseline6_0_0_Full.zip -d /opt/propertymanager
cd /opt/propertymanager/PropertyManager
```

Create the virtual environment at the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

If `pip install mariadb` reports `mariadb_config: not found`, install:

```bash
sudo apt install libmariadb-dev libmariadb-dev-compat
```

## 5. Configure the migration account

```bash
cp backend/.env.example backend/.env
chmod 600 backend/.env
```

Edit `backend/.env` temporarily:

```ini
PM_DB_HOST=localhost
PM_DB_PORT=3306
PM_DB_NAME=property_manager
PM_DB_USER=propertymanager_migrate
PM_DB_PASSWORD=DIFFERENT_LONG_RANDOM_MIGRATION_PASSWORD
PM_DB_POOL_SIZE=5
PM_FLASK_DEBUG=false
PM_LOG_LEVEL=INFO
```

Never commit `backend/.env` to Git.

## 6. Install database schema 1

With the virtual environment active:

```bash
python scripts/apply_migrations.py
```

Expected result:

```text
Applying migration 001_initial_schema.sql
```

Verify:

```bash
python scripts/verify_database.py
```

The schema version should be `1`, and all application tables should initially contain zero rows.

## 7. Export the final 5.8 backup

Before migrating real data:

1. Open the tagged Baseline 5.8.3.2 application.
2. Go to Administration → Backup / Restore.
3. Create a named JSON backup.
4. Preserve an untouched copy in a separate secure location.
5. Do not retire the 5.8 installation until the MariaDB control totals have been verified.

## 8. Validate the JSON backup without importing

```bash
python scripts/import_5x_backup.py /path/to/PropertyManager_backup.json --dry-run
```

The dry run checks:

- JSON structure
- required collections
- duplicate identifiers
- references between all related records
- backup checksum, when present
- record counts

No MariaDB data is changed during a dry run.

## 9. Import the 5.8 data

For an empty database:

```bash
python scripts/import_5x_backup.py /path/to/PropertyManager_backup.json
```

The importer preserves existing 5.x numeric IDs so that relationships remain intact. The import is one MariaDB transaction. Any failure causes a rollback.

To replace an already populated development database:

```bash
python scripts/import_5x_backup.py /path/to/PropertyManager_backup.json --replace
```

`--replace` deletes all PropertyManager application records before importing. Use it only after taking a database backup and confirming that no newer data would be lost.

Run verification again:

```bash
python scripts/verify_database.py
```

Compare these counts to the dry-run report.

## 10. Switch to the runtime account

After schema installation and import, edit `backend/.env`:

```ini
PM_DB_USER=propertymanager_app
PM_DB_PASSWORD=LONG_RANDOM_APPLICATION_PASSWORD
```

Then verify database connectivity:

```bash
python scripts/verify_database.py
```

This confirms that the restricted runtime account has sufficient read access.

## 11. Recommended development workflow

The helper scripts are the recommended way to develop and test Baseline 6.0.0.2. Run `./scripts/setup_dev.sh` once, configure both environment files, initialize/import the database, and then use `./scripts/start_dev.sh` for daily work. The launcher starts the Python API and Vite frontend together and shuts both down on `Ctrl+C`.

Run `./scripts/check_dev.sh` whenever setup or connectivity is uncertain.

## 12. Build the frontend

```bash
./scripts/build_frontend.sh
```

This runs `npm ci` and creates `frontend/dist`.

For frontend development on the LAN:

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

## 13. Manual development startup (advanced)

```bash
./scripts/run_dev_server.sh
```

Test:

```bash
curl http://127.0.0.1:5000/api/v1/system/health
```

A successful response includes:

- application version `6.0.0.2`
- API version `v1`
- expected schema version `1`
- MariaDB server and user information

Open:

```text
http://127.0.0.1:5000/
```

## 13. Production service with systemd and Gunicorn

Create `/etc/systemd/system/propertymanager.service`:

```ini
[Unit]
Description=PropertyManager Python Backend
After=network.target mariadb.service
Requires=mariadb.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/propertymanager/PropertyManager/backend
EnvironmentFile=/etc/propertymanager/propertymanager.env
ExecStart=/opt/propertymanager/PropertyManager/.venv/bin/gunicorn \
  --workers 3 \
  --bind 127.0.0.1:8000 \
  --access-logfile - \
  --error-logfile - \
  wsgi:application
Restart=on-failure
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Create the protected environment file:

```bash
sudo mkdir -p /etc/propertymanager
sudo cp backend/.env.example /etc/propertymanager/propertymanager.env
sudo chown root:www-data /etc/propertymanager/propertymanager.env
sudo chmod 640 /etc/propertymanager/propertymanager.env
sudo editor /etc/propertymanager/propertymanager.env
```

Use the restricted `propertymanager_app` credentials in this file.

Set ownership and start:

```bash
sudo chown -R www-data:www-data /opt/propertymanager/PropertyManager
sudo systemctl daemon-reload
sudo systemctl enable --now propertymanager
sudo systemctl status propertymanager
```

## 14. Apache reverse proxy

Enable modules:

```bash
sudo a2enmod proxy proxy_http headers
```

Create `/etc/apache2/sites-available/propertymanager.conf`:

```apache
<VirtualHost *:80>
    ServerName propertymanager.example.local

    ProxyPreserveHost On
    ProxyPass        / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/

    RequestHeader set X-Forwarded-Proto "http"

    ErrorLog ${APACHE_LOG_DIR}/propertymanager-error.log
    CustomLog ${APACHE_LOG_DIR}/propertymanager-access.log combined
</VirtualHost>
```

Enable and test:

```bash
sudo a2ensite propertymanager
sudo apachectl configtest
sudo systemctl reload apache2
```

For internet-facing production, enable HTTPS and change `X-Forwarded-Proto` to `https`. Do not expose MariaDB port 3306 publicly.

## 15. MariaDB backup

Example logical backup:

```bash
mariadb-dump \
  --single-transaction \
  --routines --triggers \
  -u propertymanager_migrate -p \
  property_manager > property_manager_$(date +%F).sql
```

Restore into an empty database:

```bash
mariadb -u propertymanager_migrate -p property_manager < backup.sql
```

Store database backups separately from the server and test restoration periodically.

## 16. Troubleshooting

### `mariadb_config: not found`

```bash
sudo apt install libmariadb-dev libmariadb-dev-compat
```

### Access denied

Verify the configured account and host:

```bash
mariadb -h localhost -u propertymanager_app -p property_manager
```

Then run:

```sql
SELECT DATABASE(), CURRENT_USER();
SHOW GRANTS;
```

### Health endpoint returns 503

Check:

```bash
sudo systemctl status mariadb
sudo systemctl status propertymanager
sudo journalctl -u propertymanager -n 100 --no-pager
```

### Migration reports an existing table

Do not manually delete individual tables. Confirm whether schema migration 1 was partially applied. For a fresh installation, drop and recreate only the dedicated `property_manager` database, then rerun the migration.

## 17. Baseline limitation

Baseline 6.0.0 provides the backend foundation and successful migration of 5.x data into MariaDB. The included user interface still uses its established IndexedDB repositories. REST-backed application repositories are planned for the subsequent 6.0.x integration milestone. MariaDB is therefore ready and populated, but it is not yet the authoritative live store for every UI operation in this infrastructure release.
