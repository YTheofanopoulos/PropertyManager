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
cleanup() {
  trap - INT TERM EXIT
  printf '\nStopping PropertyManager development services...\n'
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  rm -f "$PM_PID_DIR/backend.pid" "$PM_PID_DIR/frontend.pid"
}
trap cleanup INT TERM EXIT

pm_heading "Starting Python API"
(
  cd "$PM_BACKEND_DIR"
  "$PM_VENV_DIR/bin/python" app.py 2>&1 | sed -u 's/^/[backend] /'
) &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PM_PID_DIR/backend.pid"

# Give Flask a moment to bind and fail visibly if it cannot start.
sleep 1
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then pm_error "Backend stopped during startup"; exit 1; fi

pm_heading "Starting Vite frontend"
(
  cd "$PM_FRONTEND_DIR"
  npm run dev -- --host "${PM_DEV_HOST:-127.0.0.1}" 2>&1 | sed -u 's/^/[frontend] /'
) &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$PM_PID_DIR/frontend.pid"

printf '\nPropertyManager development environment is running.\n'
printf 'Frontend: http://%s:%s\n' "${PM_DEV_HOST:-127.0.0.1}" "$PM_FRONTEND_PORT"
printf 'Backend:  http://127.0.0.1:%s/api/v1/system/health\n' "$PM_BACKEND_PORT"
printf 'Press Ctrl+C to stop both services.\n\n'

wait -n "$BACKEND_PID" "$FRONTEND_PID"
pm_error "One development process stopped unexpectedly; shutting down both."
exit 1
