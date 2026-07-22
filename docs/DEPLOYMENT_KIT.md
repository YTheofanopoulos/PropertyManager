# PropertyManager Deployment Kit 1.0

Deployment Kit 1.0 builds PropertyManager on the development system and sends a production-only release archive to the server with `scp`. Node.js, npm, Vite, TypeScript, source files, and `node_modules` are not installed on production.

## Deployment layout

```text
/opt/propertymanager/
├── current -> releases/6.6.2.1
├── releases/
│   └── 6.6.2.1/
│       ├── frontend/
│       ├── backend/
│       ├── database/
│       └── scripts/
└── shared/
    ├── backend.env
    └── venv/
```

Production still requires its runtime components: Apache, MariaDB, Python 3 with `venv`, Gunicorn dependencies, and the MariaDB client development package needed to install the pinned Python connector. It does not require the frontend development/build environment.

## One-time production setup

Install runtime packages on Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y apache2 mariadb-server python3 python3-venv \
  libmariadb-dev libmariadb-dev-compat
sudo a2enmod proxy proxy_http rewrite
```

Create a dedicated account and directories:

```bash
sudo useradd --system --home /opt/propertymanager --shell /usr/sbin/nologin propertymanager
sudo mkdir -p /opt/propertymanager/{releases,shared}
sudo chown -R propertymanager:www-data /opt/propertymanager
```

Copy and edit the supplied Apache and systemd templates:

```bash
sudo cp deployment/apache/propertymanager.conf.example /etc/apache2/sites-available/propertymanager.conf
sudo cp deployment/systemd/propertymanager.service.example /etc/systemd/system/propertymanager.service
sudo a2ensite propertymanager.conf
sudo systemctl daemon-reload
sudo systemctl enable propertymanager.service
sudo systemctl reload apache2
```

The SSH deployment user must be able to write to `/opt/propertymanager` and restart `propertymanager.service`. Prefer a dedicated SSH key and a narrowly scoped sudo policy. If the deployment user owns the application tree but cannot restart the service, the release is activated and the script reports that the service still needs to be started or restarted.

## Build only

From the project root on the development system:

```bash
./deployment/deploy_scp.sh --package-only --version 6.6.2.1
```

The archive and SHA-256 file are written to `deployment/out/`.

The packager uses `npm ci` when `frontend/package-lock.json` is present. The v6.6.2 tag does not include that lockfile, so this kit falls back to `npm install` and reports the condition during packaging. Commit a verified lockfile in a future source release to make dependency resolution fully reproducible.

## Push to production

```bash
./deployment/deploy_scp.sh \
  --host property-server.example.com \
  --user deploy \
  --identity "$HOME/.ssh/propertymanager_deploy" \
  --install-root /opt/propertymanager \
  --version 6.6.2.1
```

The script builds the frontend, creates a minimal production archive, uploads the archive and checksum, verifies the checksum remotely, installs runtime Python requirements, atomically switches `current`, and restarts the service when permitted.

## First deployment

The first installation creates `/opt/propertymanager/shared/backend.env` from the example. Enter the production runtime database credentials and restrict the file to the application account:

```bash
sudoedit /opt/propertymanager/shared/backend.env
sudo chown propertymanager:www-data /opt/propertymanager/shared/backend.env
sudo chmod 600 /opt/propertymanager/shared/backend.env
sudo systemctl restart propertymanager.service
```

Database migrations are deliberately not automatic. Back up the database, temporarily supply the migration account through `shared/backend.env`, and run:

```bash
cd /opt/propertymanager/current
sudo -u propertymanager /opt/propertymanager/shared/venv/bin/python scripts/apply_migrations.py
```

Restore the restricted runtime credentials immediately afterward and restart the service. For an existing Schema 2 installation at v6.6.2, no migration is required.

## Rollback

List installed releases, repoint `current`, and restart:

```bash
ls -1 /opt/propertymanager/releases
sudo ln -sfn /opt/propertymanager/releases/PREVIOUS_VERSION /opt/propertymanager/current.new
sudo mv -Tf /opt/propertymanager/current.new /opt/propertymanager/current
sudo systemctl restart propertymanager.service
```

Do not roll the application back across an incompatible database migration without following that release's database rollback procedure.

## Files intentionally excluded

- `.git` and Git metadata
- frontend source and development configuration
- `node_modules`
- backend tests and Python caches
- local `.env` files and credentials
- database contents, backups, uploads, and production logs
