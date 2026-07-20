#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"
pm_require_venv
ENV_FILE="${PM_MIGRATION_ENV_FILE:-$PM_BACKEND_DIR/.env.migrate}"
pm_load_env "$ENV_FILE"
pm_heading "Applying database migrations"
"$PM_VENV_DIR/bin/python" "$PM_ROOT/scripts/apply_migrations.py"
pm_heading "Verifying schema"
"$PM_VENV_DIR/bin/python" "$PM_ROOT/scripts/verify_database.py"
pm_ok "Database schema is ready"
