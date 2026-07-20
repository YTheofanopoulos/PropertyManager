#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"
pm_require_command mariadb-dump
pm_load_env "${PM_ENV_FILE:-$PM_BACKEND_DIR/.env}"
OUTPUT="${1:-$PM_ROOT/backups/property_manager_$(date +%Y%m%d_%H%M%S).sql}"
mkdir -p "$(dirname "$OUTPUT")"
export MYSQL_PWD="$PM_DB_PASSWORD"
mariadb-dump --single-transaction --routines --triggers \
  -h "${PM_DB_HOST:-localhost}" -P "${PM_DB_PORT:-3306}" -u "$PM_DB_USER" \
  "$PM_DB_NAME" > "$OUTPUT"
unset MYSQL_PWD
chmod 600 "$OUTPUT"
pm_ok "Database backup written to $OUTPUT"
