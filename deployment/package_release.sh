#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-6.7.3}"
OUTPUT_DIR="${2:-$ROOT/deployment/out}"
PACKAGE_NAME="PropertyManager-${VERSION}"
STAGE_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

command -v npm >/dev/null 2>&1 || {
  echo "npm is required on the development system." >&2
  exit 1
}
command -v tar >/dev/null 2>&1 || {
  echo "tar is required on the development system." >&2
  exit 1
}

case "$VERSION" in
  *[!A-Za-z0-9._-]*|'')
    echo "Invalid version: $VERSION" >&2
    exit 1
    ;;
esac

echo "Building PropertyManager frontend..."
if [[ -f "$ROOT/frontend/package-lock.json" ]]; then
  echo "Refusing to package while frontend/package-lock.json is present." >&2
  echo "Remove it before building the PropertyManager distribution." >&2
  exit 1
else
  (
    cd "$ROOT/frontend"
    npm install --no-package-lock
    npm run build
  )
fi

mkdir -p "$STAGE_DIR/$PACKAGE_NAME/frontend" \
  "$STAGE_DIR/$PACKAGE_NAME/backend" \
  "$STAGE_DIR/$PACKAGE_NAME/database" \
  "$STAGE_DIR/$PACKAGE_NAME/scripts" \
  "$OUTPUT_DIR"

cp -a "$ROOT/frontend/dist/." "$STAGE_DIR/$PACKAGE_NAME/frontend/"
cp -a "$ROOT/backend/property_manager" "$STAGE_DIR/$PACKAGE_NAME/backend/"
cp "$ROOT/backend/wsgi.py" "$ROOT/backend/requirements.txt" \
  "$ROOT/backend/.env.example" "$ROOT/backend/.env.migrate.example" \
  "$STAGE_DIR/$PACKAGE_NAME/backend/"
cp -a "$ROOT/database/migrations" "$STAGE_DIR/$PACKAGE_NAME/database/"
cp "$ROOT/scripts/apply_migrations.py" "$ROOT/scripts/verify_database.py" \
  "$ROOT/scripts/backup_database.sh" "$ROOT/scripts/restore_database.sh" \
  "$STAGE_DIR/$PACKAGE_NAME/scripts/"

cat > "$STAGE_DIR/$PACKAGE_NAME/RELEASE" <<EOF
application_version=$VERSION
source_tag=v6.7.3
package_format=1
EOF

ARCHIVE="$OUTPUT_DIR/$PACKAGE_NAME.tar.gz"
rm -f "$ARCHIVE" "$ARCHIVE.sha256"
tar -C "$STAGE_DIR" -czf "$ARCHIVE" "$PACKAGE_NAME"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$OUTPUT_DIR" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256")
elif command -v shasum >/dev/null 2>&1; then
  (cd "$OUTPUT_DIR" && shasum -a 256 "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256")
else
  echo "A SHA-256 utility (sha256sum or shasum) is required." >&2
  exit 1
fi

echo "Created: $ARCHIVE"
echo "Checksum: $ARCHIVE.sha256"
