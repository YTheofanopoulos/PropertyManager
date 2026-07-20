#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dev_common.sh"
mkdir -p "$PM_PID_DIR"
stopped=0
for name in frontend backend; do
  file="$PM_PID_DIR/$name.pid"
  if [[ -f "$file" ]]; then
    pid="$(cat "$file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      pm_ok "Stopped $name (PID $pid)"
      stopped=1
    fi
    rm -f "$file"
  fi
done
if (( stopped == 0 )); then pm_warn "No recorded development processes were running"; fi
