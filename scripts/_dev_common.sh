#!/usr/bin/env bash
# Shared helpers for PropertyManager development scripts.
set -o pipefail

PM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PM_BACKEND_DIR="$PM_ROOT/backend"
PM_FRONTEND_DIR="$PM_ROOT/frontend"
PM_VENV_DIR="$PM_ROOT/.venv"
PM_PID_DIR="$PM_ROOT/.run"
PM_BACKEND_PORT="${PM_BACKEND_PORT:-5000}"
PM_FRONTEND_PORT="${PM_FRONTEND_PORT:-5173}"

pm_heading() { printf '\n== %s ==\n' "$1"; }
pm_ok()      { printf '[OK] %s\n' "$1"; }
pm_warn()    { printf '[WARN] %s\n' "$1" >&2; }
pm_error()   { printf '[ERROR] %s\n' "$1" >&2; }

pm_require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    pm_error "Required command not found: $1"
    return 1
  }
}

pm_load_env() {
  local env_file="${1:-$PM_BACKEND_DIR/.env}"
  if [[ ! -f "$env_file" ]]; then
    pm_error "Configuration file not found: $env_file"
    pm_error "Run ./scripts/setup_dev.sh, then edit the generated file."
    return 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}

pm_port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$port" 2>/dev/null | tail -n +2 | grep -q .
  elif command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

pm_require_venv() {
  if [[ ! -x "$PM_VENV_DIR/bin/python" ]]; then
    pm_error "Python virtual environment is missing: $PM_VENV_DIR"
    pm_error "Run ./scripts/setup_dev.sh first."
    return 1
  fi
}

pm_database_check() {
  "$PM_VENV_DIR/bin/python" "$PM_ROOT/scripts/verify_database.py" >/dev/null
}
