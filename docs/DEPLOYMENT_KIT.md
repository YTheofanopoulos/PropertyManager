# PropertyManager Deployment Kit 1.1

Deployment Kit 1.1 supports a production-style local VM test and a production installation. Both use Apache for the compiled frontend, Gunicorn for the Flask API, systemd for supervision, and MariaDB for data.

## Deployment modes

| Mode | Command | Install root | Apache | Gunicorn | Service |
|---|---|---|---:|---:|---|
| Local VM test | `sudo ./deployment/deploy.sh local` | `/opt/propertymanager-test` | 8080 | 5001 | `propertymanager-test.service` |
| Production | `sudo ./deployment/deploy.sh production` | `/opt/propertymanager` | 80 | 5000 | `propertymanager.service` |

The modes are isolated. Local deployment does not replace or restart production.

## Before deploying

The release archive and matching `.sha256` file must be in `deployment/out/`. Kit 1.1 includes v6.6.2.1. On Ubuntu/Debian, the deployment command installs missing runtime packages when necessary.

Database migrations are deliberately not automatic. A restored or existing Schema 2 database for v6.6.2.1 requires no migration.

## Local production-style VM test

From the extracted kit root:

```bash
sudo ./deployment/deploy.sh local
```

On first installation, answer the MariaDB prompts. Password input is hidden. The command verifies the archive, installs under `/opt`, creates the persistent environment, configures systemd and Apache, starts the application, and verifies the frontend and API.

Open `http://localhost:8080`.

Check it later:

```bash
sudo ./deployment/deploy.sh status-local
```

Remove the local test:

```bash
sudo ./deployment/deploy.sh remove-local
```

Removal disables the test service and Apache site, then renames the installation with a timestamp rather than deleting it. MariaDB is not changed.

## Production

```bash
sudo PROPERTYMANAGER_SERVER_NAME=propertymanager.example.com \
  ./deployment/deploy.sh production
```

`PROPERTYMANAGER_SERVER_NAME` is required so Apache routes the production hostname deliberately. Add HTTPS/certificates after HTTP is healthy. Existing persistent `backend.env` configuration is retained on upgrades.

## Select a specific archive

```bash
sudo ./deployment/deploy.sh local \
  ./deployment/out/PropertyManager-6.6.2.1.tar.gz
```

Without a path, the newest matching archive in `deployment/out/` is selected.

## Diagnostics

```bash
systemctl status propertymanager-test.service
journalctl -u propertymanager-test.service
tail -f /var/log/apache2/propertymanager-local-error.log
curl -i http://localhost:8080/api/v1/system/health
```

For production, use `propertymanager.service`, port 80, and `propertymanager-production-error.log`.

## Build a new application release

On a development machine with npm:

```bash
./deployment/package_release.sh 6.6.2.1
```

The archive excludes `.git`, Git metadata, `package-lock.json`, `node_modules`, frontend source, tests, credentials, database contents, backups, and logs. Production does not need Node, npm, Vite, or TypeScript.

`deployment/deploy_scp.sh` remains available for package transfer. `deploy.sh` is the preferred first-time setup and local VM test path.
