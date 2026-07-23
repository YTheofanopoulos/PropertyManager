#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-}"

usage() {
  cat <<'EOF'
Usage:
  sudo ./deployment/deploy.sh local [ARCHIVE]
  sudo ./deployment/deploy.sh production [ARCHIVE]
  sudo ./deployment/deploy.sh remove-local
  sudo ./deployment/deploy.sh status-local
EOF
}
die() { echo "ERROR: $*" >&2; exit 1; }
require_root() { [[ ${EUID:-$(id -u)} -eq 0 ]] || die "Run this command with sudo."; }

find_archive() {
  if [[ -n "${1:-}" ]]; then
    [[ -f "$1" ]] || die "Release archive not found: $1"
    readlink -f "$1"
    return
  fi
  local newest
  newest="$(find "$SCRIPT_DIR/out" -maxdepth 1 -type f -name 'PropertyManager-*.tar.gz' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n1 | cut -d' ' -f2-)"
  [[ -n "$newest" ]] || die "No release archive found in $SCRIPT_DIR/out"
  readlink -f "$newest"
}

ensure_runtime() {
  local missing=() cmd
  for cmd in apache2ctl a2enmod a2ensite curl python3 sha256sum systemctl; do
    command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
  done
  if ((${#missing[@]})); then
    command -v apt-get >/dev/null 2>&1 || die "Missing runtime commands: ${missing[*]}"
    echo "Installing required runtime packages..."
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y apache2 python3 python3-venv libmariadb-dev libmariadb-dev-compat curl acl
  fi
  python3 -m venv --help >/dev/null 2>&1 || die "python3-venv is required."
}

port_used_by_other_process() {
  local port="$1" allowed="$2" listeners
  listeners="$(ss -ltnp 2>/dev/null | grep -E ":${port}[[:space:]]" || true)"
  [[ -n "$listeners" ]] && ! grep -qE "$allowed" <<<"$listeners"
}

configure_env() {
  local env_file="$1"
  if ! grep -q '^PM_DB_PASSWORD=change-me$' "$env_file"; then
    echo "Keeping existing database configuration: $env_file"
    return
  fi
  [[ -t 0 ]] || die "Edit $env_file with database credentials, then rerun."
  local host port name user password
  read -r -p "MariaDB host [localhost]: " host; host="${host:-localhost}"
  read -r -p "MariaDB port [3306]: " port; port="${port:-3306}"
  read -r -p "Database name [property_manager]: " name; name="${name:-property_manager}"
  read -r -p "Database user [propertymanager_app]: " user; user="${user:-propertymanager_app}"
  read -r -s -p "Database password: " password; echo
  [[ -n "$password" ]] || die "Database password cannot be empty."
  cat > "$env_file" <<EOF
PM_DB_HOST=$host
PM_DB_PORT=$port
PM_DB_NAME=$name
PM_DB_USER=$user
PM_DB_PASSWORD=$password
PM_DB_POOL_SIZE=5
PM_FLASK_DEBUG=false
PM_LOG_LEVEL=INFO
EOF
  chmod 600 "$env_file"
}

deploy_mode() {
  local target="$1" archive="$2"
  local install_root service_name service_user apache_site apache_port backend_port server_name
  if [[ "$target" == local ]]; then
    install_root=/opt/propertymanager-test
    service_name=propertymanager-test.service
    service_user=propertymanager-test
    apache_site=propertymanager-test.conf
    apache_port=8080
    backend_port=5001
    server_name=localhost
  else
    install_root=/opt/propertymanager
    service_name=propertymanager.service
    service_user=propertymanager
    apache_site=propertymanager.conf
    apache_port=80
    backend_port=5000
    server_name="${PROPERTYMANAGER_SERVER_NAME:-}"
    [[ -n "$server_name" ]] || die "Set PROPERTYMANAGER_SERVER_NAME for production."
  fi

  [[ -f "$archive.sha256" ]] || die "Checksum not found: $archive.sha256"
  if port_used_by_other_process "$backend_port" "gunicorn.*${backend_port}|systemd" && ! systemctl is-active --quiet "$service_name"; then
    die "Backend port $backend_port is already in use."
  fi
  if [[ "$target" == local ]] && port_used_by_other_process "$apache_port" apache2; then
    die "Local test port $apache_port is already used by another process."
  fi

  id "$service_user" >/dev/null 2>&1 || useradd --system --home "$install_root" --shell /usr/sbin/nologin "$service_user"
  mkdir -p "$install_root"
  PROPERTYMANAGER_SERVICE_NAME="$service_name" "$SCRIPT_DIR/install_release.sh" "$archive" "$install_root"
  configure_env "$install_root/shared/backend.env"
  chown -R "$service_user:www-data" "$install_root"
  chmod 640 "$install_root/shared/backend.env"

  cat > "/etc/systemd/system/$service_name" <<EOF
[Unit]
Description=PropertyManager Gunicorn API ($target)
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=notify
User=$service_user
Group=www-data
WorkingDirectory=$install_root/current/backend
ExecStart=$install_root/shared/venv/bin/gunicorn --bind 127.0.0.1:$backend_port --workers 2 wsgi:application
Restart=on-failure
RestartSec=5
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

  if [[ "$target" == local ]] && ! grep -RqE '^[[:space:]]*Listen[[:space:]]+8080([[:space:]]|$)' /etc/apache2; then
    echo 'Listen 8080' > /etc/apache2/conf-available/propertymanager-test-port.conf
    a2enconf propertymanager-test-port >/dev/null
  fi
  a2enmod proxy proxy_http >/dev/null
  cat > "/etc/apache2/sites-available/$apache_site" <<EOF
<VirtualHost *:$apache_port>
    ServerName $server_name
    DocumentRoot $install_root/current/frontend
    DirectoryIndex index.html
    <Directory $install_root/current/frontend>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
        FallbackResource /index.html
    </Directory>
    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:$backend_port/api/
    ProxyPassReverse /api/ http://127.0.0.1:$backend_port/api/
    ErrorLog \${APACHE_LOG_DIR}/propertymanager-${target}-error.log
    CustomLog \${APACHE_LOG_DIR}/propertymanager-${target}-access.log combined
</VirtualHost>
EOF
  a2ensite "$apache_site" >/dev/null
  apache2ctl configtest
  systemctl daemon-reload
  systemctl enable --now "$service_name"
  systemctl reload apache2

  local url="http://localhost:$apache_port" attempt
  for attempt in {1..20}; do
    if curl -fsS "$url/api/v1/system/health" >/dev/null 2>&1 && curl -fsS "$url/" >/dev/null 2>&1; then break; fi
    sleep 1
  done
  curl -fsS "$url/api/v1/system/health" >/dev/null || die "API check failed. Run: journalctl -u $service_name"
  curl -fsS "$url/" >/dev/null || die "Frontend check failed. Check the Apache error log."
  echo
  echo "PropertyManager $target deployment is ready: $url"
  echo "Service: $service_name"
  echo "Install root: $install_root"
}

remove_local() {
  require_root
  systemctl disable --now propertymanager-test.service 2>/dev/null || true
  a2dissite propertymanager-test.conf >/dev/null 2>&1 || true
  a2disconf propertymanager-test-port >/dev/null 2>&1 || true
  apache2ctl configtest && systemctl reload apache2
  if [[ -d /opt/propertymanager-test ]]; then
    local timestamp
    timestamp="$(date +%Y%m%d-%H%M%S)"
    mv /opt/propertymanager-test "/opt/propertymanager-test.removed-$timestamp"
    echo "Test installation preserved at /opt/propertymanager-test.removed-$timestamp"
  fi
  echo "Local site and service removed. MariaDB was not changed."
}

case "$MODE" in
  local|production)
    require_root
    ensure_runtime
    deploy_mode "$MODE" "$(find_archive "${2:-}")"
    ;;
  remove-local) remove_local ;;
  status-local)
    systemctl --no-pager --full status propertymanager-test.service || true
    curl -fsS http://localhost:8080/api/v1/system/health && echo || true
    ;;
  -h|--help|'') usage ;;
  *) usage; die "Unknown command: $MODE" ;;
esac
