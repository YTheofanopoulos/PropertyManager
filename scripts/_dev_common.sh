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
  local python_bin="$PM_VENV_DIR/bin/python"
  local exports
  if [[ ! -f "$env_file" ]]; then
    pm_error "Configuration file not found: $env_file"
    pm_error "Run ./scripts/setup_dev.sh, then edit the generated file."
    return 1
  fi
  if [[ ! -x "$python_bin" ]]; then
    pm_error "Python virtual environment is missing: $PM_VENV_DIR"
    pm_error "Run ./scripts/setup_dev.sh first."
    return 1
  fi

  # Do not source .env files as shell scripts. Database passwords commonly
  # contain $, !, #, quotes, spaces, or backticks, all of which Bash may
  # interpret. python-dotenv parses the file as data; shlex.quote then produces
  # a safe export statement for each validated variable name.
  if ! exports="$("$python_bin" - "$env_file" <<'PY'
import re
import shlex
import sys

from dotenv import dotenv_values

path = sys.argv[1]
try:
    values = dotenv_values(path, interpolate=False)
except Exception as exc:
    print(f"Unable to parse {path}: {exc}", file=sys.stderr)
    raise SystemExit(1)

for key, value in values.items():
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
        print(f"Invalid environment variable name in {path}: {key!r}", file=sys.stderr)
        raise SystemExit(1)
    if value is None:
        value = ""
    print(f"export {key}={shlex.quote(value)}")
PY
  )"; then
    pm_error "Could not load configuration: $env_file"
    return 1
  fi

  eval "$exports"
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
