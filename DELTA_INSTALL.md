# Baseline 6.7.0 Delta Installation

This archive is rooted at the PropertyManager project directory. It does **not** contain an enclosing `PropertyManager/` folder.

Apply it from inside a clean Baseline 6.6.2.1 project directory:

```bash
cd /path/to/your/PropertyManager6.6.2.1
unzip -o /path/to/PropertyManager_Baseline6_7_0_Delta.zip
```

Install the new Python authentication dependencies:

```bash
chmod +x scripts/*.sh
./scripts/setup_dev.sh
```

Edit `backend/.env` and add:

```ini
PM_AUTH_PATH=/absolute/path/to/your/login
PM_AUTH_DATABASE=auth
PM_AUTH_SCOPE=propertymanager
PM_AUTH_READ_LEVEL=1
PM_AUTH_WRITE_LEVEL=5
```

The configured directory must contain `mongoclass.py` and `shared_auth/`.
In SharedAuth administration, assign users the
`propertymanager` scope before they attempt to sign in.

Verify and start:

```bash
./scripts/check_dev.sh
./scripts/start_dev.sh
```

Browse to the Vite address and sign in with an existing SharedAuth account.
Test logout and confirm an account without the scope is denied.

This delta requires Baseline 6.6.2.1. REST API v1 and MariaDB Schema 2 are unchanged; no database migration is required.
