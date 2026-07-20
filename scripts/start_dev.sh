#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"
pm_require_venv
pm_require_command npm
pm_load_env "${PM_ENV_FILE:-$PM_BACKEND_DIR/.env}"

if pm_port_in_use "$PM_BACKEND_PORT"; then pm_error "Backend port $PM_BACKEND_PORT is already in use"; exit 1; fi
if pm_port_in_use "$PM_FRONTEND_PORT"; then pm_error "Frontend port $PM_FRONTEND_PORT is already in use"; exit 1; fi
if ! pm_database_check; then
  pm_error "Database verification failed. Run ./scripts/check_dev.sh for details."
  exit 1
fi

mkdir -p "$PM_PID_DIR"
BACKEND_PID=""; FRONTEND_PID=""
CLEANUP_STARTED=0

start_process_group() {
  local label="$1"
  local working_directory="$2"
  shift 2
  "$PM_VENV_DIR/bin/python" -c '
import os
import sys

os.setsid()
os.chdir(sys.argv[1])
os.execvp(sys.argv[2], sys.argv[2:])
' "$working_directory" "$@" > >(sed -u "s/^/[$label] /") 2>&1 &
  STARTED_PID=$!
}

signal_group() {
  local signal="$1"
  local pid="$2"
  [[ -n "$pid" ]] || return 0
  if kill -0 -- "-$pid" 2>/dev/null; then
    kill "-$signal" -- "-$pid" 2>/dev/null || true
  elif kill -0 "$pid" 2>/dev/null; then
    kill "-$signal" "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  local status=$?
  local attempt
  if (( CLEANUP_STARTED )); then return; fi
  CLEANUP_STARTED=1
  trap - INT TERM EXIT
  printf '\nStopping PropertyManager development services...\n'
  signal_group TERM "$FRONTEND_PID"
  signal_group TERM "$BACKEND_PID"

  # Allow each service group to stop cleanly, then prevent a hung child from
  # keeping the development launcher alive indefinitely.
  for attempt in 1 2 3 4 5; do
    if ! { [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; } &&
       ! { [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; }; then
      break
    fi
    sleep 1
  done
  signal_group KILL "$FRONTEND_PID"
  signal_group KILL "$BACKEND_PID"

  [[ -n "$FRONTEND_PID" ]] && wait "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$BACKEND_PID" ]] && wait "$BACKEND_PID" 2>/dev/null || true
  rm -f "$PM_PID_DIR/backend.pid" "$PM_PID_DIR/frontend.pid"
  printf 'PropertyManager development services stopped.\n'
  return "$status"
}
trap 'exit 130' INT
trap 'exit 143' TERM
trap cleanup EXIT

pm_heading "Starting Python API"
export PM_FLASK_USE_RELOADER=false
start_process_group backend "$PM_BACKEND_DIR" "$PM_VENV_DIR/bin/python" app.py
BACKEND_PID="$STARTED_PID"
echo "$BACKEND_PID" > "$PM_PID_DIR/backend.pid"

# Give Flask a moment to bind and fail visibly if it cannot start.
sleep 1
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then pm_error "Backend stopped during startup"; exit 1; fi

pm_heading "Starting Vite frontend"
start_process_group frontend "$PM_FRONTEND_DIR" npm run dev -- --host 0.0.0.0
FRONTEND_PID="$STARTED_PID"
echo "$FRONTEND_PID" > "$PM_PID_DIR/frontend.pid"

printf '\nPropertyManager development environment is running.\n'
printf 'Frontend (local): http://127.0.0.1:%s\n' "$PM_FRONTEND_PORT"
printf 'Frontend (LAN):   http://<development-machine-IP>:%s\n' "$PM_FRONTEND_PORT"
printf 'Backend:  http://127.0.0.1:%s/api/v1/system/health\n' "$PM_BACKEND_PORT"
printf 'Press Ctrl+C to stop both services.\n\n'

if wait -n "$BACKEND_PID" "$FRONTEND_PID"; then
  pm_warn "One development process exited; shutting down both."
else
  pm_error "One development process stopped unexpectedly; shutting down both."
fi
exit 1
