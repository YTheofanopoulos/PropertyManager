# Baseline 6.6.0 Delta Installation

This archive is rooted at the PropertyManager project directory. It does **not** contain an enclosing `PropertyManager/` folder.

Apply it from inside a clean Baseline 6.5.0 project directory:

```bash
cd /path/to/your/PropertyManager6.5.0
unzip -o /path/to/PropertyManager_Baseline6_6_0_Delta.zip
```

Then refresh dependencies and apply Schema 2 before starting the services:

```bash
chmod +x scripts/*.sh
./scripts/setup_dev.sh
./scripts/init_database.sh
./scripts/check_dev.sh
```

For normal daily testing:

```bash
./scripts/start_dev.sh
```

The launcher starts both the Python backend and the Vite frontend. Press `Ctrl+C` to stop both processes.

This delta requires Baseline 6.5.0. REST API v1 is unchanged; database schema advances from 1 to 2.
