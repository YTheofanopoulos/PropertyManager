# Baseline 6.0.0.2 Delta Installation

This archive is rooted at the PropertyManager project directory. It does **not** contain an enclosing `PropertyManager/` folder.

Apply it from inside the directory that contains your Baseline 6.0.0 project:

```bash
cd /path/to/your/PropertyManager6.0.0
unzip -o /path/to/PropertyManager_Baseline6_0_0_2_Delta.zip
```

Then prepare or refresh the development environment:

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

This delta requires Baseline 6.0.0. REST API v1 and database schema 1 are unchanged.
