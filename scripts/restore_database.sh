#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"
if [[ $# -ne 1 ]]; then echo "Usage: $0 BACKUP.sql" >&2; exit 2; fi
[[ -f "$1" ]] || { pm_error "Backup file not found: $1"; exit 1; }
pm_require_command mariadb
pm_load_env "${PM_MIGRATION_ENV_FILE:-$PM_BACKEND_DIR/.env.migrate}"
printf 'This will replace data in database %s using %s. Type RESTORE to continue: ' "$PM_DB_NAME" "$1"
read -r confirmation
[[ "$confirmation" == "RESTORE" ]] || { pm_warn "Restore cancelled"; exit 1; }
export MYSQL_PWD="$PM_DB_PASSWORD"
mariadb -h "${PM_DB_HOST:-localhost}" -P "${PM_DB_PORT:-3306}" -u "$PM_DB_USER" "$PM_DB_NAME" < "$1"
unset MYSQL_PWD
pm_ok "Database restore completed"
