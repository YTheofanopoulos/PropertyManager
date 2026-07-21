#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"

pm_heading "Checking prerequisites"
pm_require_command python3
pm_require_command node
pm_require_command npm
pm_require_command mariadb_config
pm_ok "Python: $(python3 --version 2>&1)"
pm_ok "Node: $(node --version 2>&1)"
pm_ok "npm: $(npm --version 2>&1)"
pm_ok "MariaDB Connector/C: $(mariadb_config --version 2>&1)"

pm_heading "Preparing Python environment"
if [[ ! -d "$PM_VENV_DIR" ]]; then
  python3 -m venv "$PM_VENV_DIR"
  pm_ok "Created $PM_VENV_DIR"
else
  pm_ok "Virtual environment already exists"
fi
"$PM_VENV_DIR/bin/python" -m pip install --upgrade pip
"$PM_VENV_DIR/bin/python" -m pip install -r "$PM_BACKEND_DIR/requirements.txt"
pm_ok "Python dependencies installed"

pm_heading "Preparing frontend"
if [[ -f "$PM_FRONTEND_DIR/package-lock.json" ]]; then
  npm --prefix "$PM_FRONTEND_DIR" ci
else
  npm --prefix "$PM_FRONTEND_DIR" install
fi
pm_ok "Frontend dependencies installed"

pm_heading "Preparing configuration"
if [[ ! -f "$PM_BACKEND_DIR/.env" ]]; then
  cp "$PM_BACKEND_DIR/.env.example" "$PM_BACKEND_DIR/.env"
  chmod 600 "$PM_BACKEND_DIR/.env"
  pm_warn "Created backend/.env. Edit the database password and PM_AUTH_PATH before starting."
else
  pm_ok "backend/.env already exists"
fi
if [[ ! -f "$PM_BACKEND_DIR/.env.migrate" ]]; then
  cp "$PM_BACKEND_DIR/.env.migrate.example" "$PM_BACKEND_DIR/.env.migrate"
  chmod 600 "$PM_BACKEND_DIR/.env.migrate"
  pm_warn "Created backend/.env.migrate. Edit the migration password before initializing the database."
else
  pm_ok "backend/.env.migrate already exists"
fi
mkdir -p "$PM_PID_DIR"

printf '\nSetup complete. Next steps:\n'
printf '  1. Edit backend/.env (MariaDB + SharedAuth) and backend/.env.migrate\n'
printf '  2. Run ./scripts/init_database.sh\n'
printf '  3. Optionally import data with ./scripts/import_5x_backup.sh FILE.json\n'
printf '  4. Run ./scripts/start_dev.sh\n'
