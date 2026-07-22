#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:?Usage: install_release.sh ARCHIVE [INSTALL_ROOT]}"
INSTALL_ROOT="${2:-/opt/propertymanager}"
ARCHIVE="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")"
CHECKSUM="$ARCHIVE.sha256"
RELEASES_DIR="$INSTALL_ROOT/releases"
SHARED_DIR="$INSTALL_ROOT/shared"

[[ -f "$ARCHIVE" ]] || { echo "Archive not found: $ARCHIVE" >&2; exit 1; }
[[ -f "$CHECKSUM" ]] || { echo "Checksum not found: $CHECKSUM" >&2; exit 1; }

case "$INSTALL_ROOT" in
  /|/bin|/boot|/dev|/etc|/home|/lib|/lib64|/opt|/proc|/root|/run|/sbin|/srv|/sys|/tmp|/usr|/var)
    echo "Refusing unsafe install root: $INSTALL_ROOT" >&2
    exit 1
    ;;
esac

command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required on production." >&2
  exit 1
}

echo "Verifying release checksum..."
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$(dirname "$ARCHIVE")" && sha256sum -c "$(basename "$CHECKSUM")")
else
  echo "sha256sum is required on production." >&2
  exit 1
fi

TOP_LEVEL="$(tar -tzf "$ARCHIVE" | sed -n '1s#/.*##p')"
case "$TOP_LEVEL" in
  PropertyManager-*) ;;
  *) echo "Unexpected archive layout." >&2; exit 1 ;;
esac

if tar -tzf "$ARCHIVE" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo "Unsafe path found in release archive." >&2
  exit 1
fi

VERSION="${TOP_LEVEL#PropertyManager-}"
RELEASE_DIR="$RELEASES_DIR/$VERSION"
[[ ! -e "$RELEASE_DIR" ]] || {
  echo "Release already exists: $RELEASE_DIR" >&2
  exit 1
}

mkdir -p "$RELEASES_DIR" "$SHARED_DIR"
TEMP_DIR="$(mktemp -d "$RELEASES_DIR/.install-${VERSION}.XXXXXX")"
cleanup() {
  [[ -d "$TEMP_DIR" ]] && rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

tar -xzf "$ARCHIVE" -C "$TEMP_DIR" --strip-components=1

if [[ ! -f "$SHARED_DIR/backend.env" ]]; then
  cp "$TEMP_DIR/backend/.env.example" "$SHARED_DIR/backend.env"
  chmod 600 "$SHARED_DIR/backend.env"
  echo "Created $SHARED_DIR/backend.env; configure it before starting the service."
fi
ln -sfn "$SHARED_DIR/backend.env" "$TEMP_DIR/backend/.env"

if [[ ! -d "$SHARED_DIR/venv" ]]; then
  echo "Creating shared production Python environment..."
  VENV_TEMP="$SHARED_DIR/.venv-install-$$"
  if ! python3 -m venv "$VENV_TEMP"; then
    rm -rf "$VENV_TEMP"
    echo "Unable to create the Python environment. Install the python3-venv package and retry." >&2
    exit 1
  fi
  mv "$VENV_TEMP" "$SHARED_DIR/venv"
fi

echo "Installing production Python dependencies..."
"$SHARED_DIR/venv/bin/python" -m pip install --upgrade pip
"$SHARED_DIR/venv/bin/python" -m pip install -r "$TEMP_DIR/backend/requirements.txt"

mv "$TEMP_DIR" "$RELEASE_DIR"
trap - EXIT

PREVIOUS_TARGET=""
if [[ -L "$INSTALL_ROOT/current" ]]; then
  PREVIOUS_TARGET="$(readlink "$INSTALL_ROOT/current")"
fi
ln -sfn "$RELEASE_DIR" "$INSTALL_ROOT/current.new"
mv -Tf "$INSTALL_ROOT/current.new" "$INSTALL_ROOT/current"

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet propertymanager.service; then
  if ! systemctl restart propertymanager.service; then
    echo "Service restart failed; restoring previous release." >&2
    if [[ -n "$PREVIOUS_TARGET" ]]; then
      ln -sfn "$PREVIOUS_TARGET" "$INSTALL_ROOT/current.new"
      mv -Tf "$INSTALL_ROOT/current.new" "$INSTALL_ROOT/current"
      systemctl restart propertymanager.service || true
    else
      rm -f "$INSTALL_ROOT/current"
    fi
    exit 1
  fi
else
  echo "propertymanager.service is not active; release activated but not started."
fi

echo "Active release: $RELEASE_DIR"
