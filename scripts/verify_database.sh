#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"
pm_require_venv
pm_load_env "${PM_ENV_FILE:-$PM_BACKEND_DIR/.env}"
exec "$PM_VENV_DIR/bin/python" "$PM_ROOT/scripts/verify_database.py"
