# Baseline 6.6.2.1 Delta Installation

This archive is rooted at the PropertyManager project directory. It does **not** contain an enclosing `PropertyManager/` folder.

Apply it from inside a clean Baseline 6.6.2 project directory:

```bash
cd /path/to/your/PropertyManager6.6.2
unzip -o /path/to/PropertyManager_Baseline6_6_2_1_Delta.zip
```

Then refresh dependencies and start the services:

```bash
chmod +x scripts/*.sh
./scripts/setup_dev.sh
./scripts/check_dev.sh
```

For normal daily testing:

```bash
./scripts/start_dev.sh
```

The launcher starts both the Python backend and the Vite frontend. Press `Ctrl+C` to stop both processes.

This delta requires Baseline 6.6.2. REST API v1 and MariaDB Schema 2 are unchanged; no database migration is required.
