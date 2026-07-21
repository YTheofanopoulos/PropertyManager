#!/usr/bin/env bash
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"
failures=0
check_cmd() {
  local cmd="$1" label="$2"
  if command -v "$cmd" >/dev/null 2>&1; then pm_ok "$label: $($cmd --version 2>&1 | head -1)"; else pm_error "$label is missing"; failures=$((failures+1)); fi
}

pm_heading "Tools"
check_cmd python3 "Python"
check_cmd node "Node"
check_cmd npm "npm"
check_cmd mariadb "MariaDB client"
if command -v mariadb_config >/dev/null 2>&1; then pm_ok "MariaDB Connector/C: $(mariadb_config --version)"; else pm_error "mariadb_config is missing"; failures=$((failures+1)); fi

pm_heading "Project"
if [[ -x "$PM_VENV_DIR/bin/python" ]]; then pm_ok "Virtual environment exists"; else pm_error "Virtual environment missing"; failures=$((failures+1)); fi
if [[ -d "$PM_FRONTEND_DIR/node_modules" ]]; then pm_ok "Frontend dependencies installed"; else pm_error "frontend/node_modules missing"; failures=$((failures+1)); fi
if [[ -f "$PM_BACKEND_DIR/.env" ]]; then pm_ok "Runtime configuration exists"; else pm_error "backend/.env missing"; failures=$((failures+1)); fi
if [[ -f "$PM_BACKEND_DIR/.env.migrate" ]]; then pm_ok "Migration configuration exists"; else pm_warn "backend/.env.migrate missing"; fi

pm_heading "Ports"
if pm_port_in_use "$PM_BACKEND_PORT"; then pm_warn "Backend port $PM_BACKEND_PORT is already in use"; else pm_ok "Backend port $PM_BACKEND_PORT is available"; fi
if pm_port_in_use "$PM_FRONTEND_PORT"; then pm_warn "Frontend port $PM_FRONTEND_PORT is already in use"; else pm_ok "Frontend port $PM_FRONTEND_PORT is available"; fi

pm_heading "Database"
if [[ -x "$PM_VENV_DIR/bin/python" && -f "$PM_BACKEND_DIR/.env" ]]; then
  if pm_load_env "$PM_BACKEND_DIR/.env" && "$PM_VENV_DIR/bin/python" "$PM_ROOT/scripts/verify_database.py"; then
    pm_ok "Database connection and schema verified"
  else
    pm_error "Database verification failed"
    failures=$((failures+1))
  fi
else
  pm_warn "Database check skipped until setup is complete"
fi

pm_heading "SharedAuth"
if [[ -f "$PM_BACKEND_DIR/.env" ]] && pm_load_env "$PM_BACKEND_DIR/.env"; then
  if [[ -n "${PM_AUTH_PATH:-}" && -f "${PM_AUTH_PATH}/mongoclass.py" && -d "${PM_AUTH_PATH}/shared_auth" ]]; then
    pm_ok "SharedAuth installation found: $PM_AUTH_PATH"
  else
    pm_error "PM_AUTH_PATH must point to the login directory containing mongoclass.py and shared_auth/"
    failures=$((failures+1))
  fi
  if [[ -n "${PM_AUTH_SCOPE:-}" ]]; then pm_ok "SharedAuth scope: $PM_AUTH_SCOPE"; else pm_error "PM_AUTH_SCOPE is missing"; failures=$((failures+1)); fi
fi

printf '\n'
if (( failures > 0 )); then
  pm_error "$failures required check(s) failed"
  exit 1
fi
pm_ok "Development environment is ready"
