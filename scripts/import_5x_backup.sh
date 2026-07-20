#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 BACKUP.json [--dry-run|--replace]" >&2
  exit 2
fi
pm_require_venv
BACKUP="$1"; shift
[[ -f "$BACKUP" ]] || { pm_error "Backup file not found: $BACKUP"; exit 1; }
ENV_FILE="${PM_MIGRATION_ENV_FILE:-$PM_BACKEND_DIR/.env.migrate}"
pm_load_env "$ENV_FILE"
pm_heading "Importing Baseline 5.x backup"
"$PM_VENV_DIR/bin/python" "$PM_ROOT/scripts/import_5x_backup.py" "$BACKUP" "$@"
pm_heading "Verifying imported data"
"$PM_VENV_DIR/bin/python" "$PM_ROOT/scripts/verify_database.py"
