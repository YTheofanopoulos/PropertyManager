#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST=""
REMOTE_USER=""
VERSION="6.6.2.1"
REMOTE_STAGING="/tmp/propertymanager-deploy"
INSTALL_ROOT="/opt/propertymanager"
IDENTITY_FILE=""
SSH_PORT="22"
PACKAGE_ONLY=false

usage() {
  cat <<'EOF'
Usage:
  deployment/deploy_scp.sh --package-only [--version VERSION]
  deployment/deploy_scp.sh --host HOST --user USER [options]

Options:
  --host HOST             Production SSH host
  --user USER             Production SSH user
  --version VERSION       Release version (default: 6.6.2.1)
  --identity FILE         SSH private-key file
  --port PORT             SSH port (default: 22)
  --remote-staging PATH   Upload directory (default: /tmp/propertymanager-deploy)
  --install-root PATH     Release root (default: /opt/propertymanager)
  --package-only          Build the archive without uploading it
  -h, --help              Show this help
EOF
}

while (($#)); do
  case "$1" in
    --host) HOST="${2:?Missing value for --host}"; shift 2 ;;
    --user) REMOTE_USER="${2:?Missing value for --user}"; shift 2 ;;
    --version) VERSION="${2:?Missing value for --version}"; shift 2 ;;
    --identity) IDENTITY_FILE="${2:?Missing value for --identity}"; shift 2 ;;
    --port) SSH_PORT="${2:?Missing value for --port}"; shift 2 ;;
    --remote-staging) REMOTE_STAGING="${2:?Missing value for --remote-staging}"; shift 2 ;;
    --install-root) INSTALL_ROOT="${2:?Missing value for --install-root}"; shift 2 ;;
    --package-only) PACKAGE_ONLY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$SSH_PORT" in *[!0-9]*|'') echo "Invalid SSH port: $SSH_PORT" >&2; exit 2 ;; esac
case "$REMOTE_STAGING" in /*) ;; *) echo "--remote-staging must be an absolute path" >&2; exit 2 ;; esac
case "$INSTALL_ROOT" in /*) ;; *) echo "--install-root must be an absolute path" >&2; exit 2 ;; esac
case "$REMOTE_STAGING" in *[!A-Za-z0-9._/-]*) echo "Unsafe --remote-staging path" >&2; exit 2 ;; esac
case "$INSTALL_ROOT" in *[!A-Za-z0-9._/-]*) echo "Unsafe --install-root path" >&2; exit 2 ;; esac
if [[ -n "$IDENTITY_FILE" && ! -f "$IDENTITY_FILE" ]]; then
  echo "SSH identity file not found: $IDENTITY_FILE" >&2
  exit 2
fi

"$ROOT/deployment/package_release.sh" "$VERSION"
ARCHIVE="$ROOT/deployment/out/PropertyManager-${VERSION}.tar.gz"
CHECKSUM="$ARCHIVE.sha256"

if "$PACKAGE_ONLY"; then
  exit 0
fi

if [[ -z "$HOST" || -z "$REMOTE_USER" ]]; then
  echo "--host and --user are required unless --package-only is used." >&2
  exit 2
fi

SSH_OPTIONS=(-p "$SSH_PORT")
SCP_OPTIONS=(-P "$SSH_PORT")
if [[ -n "$IDENTITY_FILE" ]]; then
  SSH_OPTIONS+=(-i "$IDENTITY_FILE")
  SCP_OPTIONS+=(-i "$IDENTITY_FILE")
fi

REMOTE="$REMOTE_USER@$HOST"
REMOTE_ARCHIVE="$REMOTE_STAGING/$(basename "$ARCHIVE")"

echo "Preparing production staging directory..."
ssh "${SSH_OPTIONS[@]}" "$REMOTE" "mkdir -p '$REMOTE_STAGING'"

echo "Uploading release and checksum..."
scp "${SCP_OPTIONS[@]}" "$ARCHIVE" "$CHECKSUM" "$REMOTE:$REMOTE_STAGING/"

echo "Installing release on production..."
ssh "${SSH_OPTIONS[@]}" "$REMOTE" \
  "bash -s -- '$REMOTE_ARCHIVE' '$INSTALL_ROOT'" \
  < "$ROOT/deployment/install_release.sh"

echo "Deployment completed: PropertyManager $VERSION"
