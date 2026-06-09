#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/family-testing-services"
DEST="$ROOT/family-testing-deploy"
ZIP="$ROOT/family-testing-deploy.zip"

rm -rf "$DEST"
mkdir -p "$DEST/public"

cp "$SRC/package.json" "$SRC/package-lock.json" "$SRC/server.js" "$SRC/.env.example" "$DEST/"
cp -r "$SRC/public/." "$DEST/public/"

cat > "$DEST/README.md" <<'EOF'
# Family Testing Services — Standalone Deploy Package

Upload **this entire folder** to GoDaddy Node.js Hosting.
Self-contained — no monorepo, no pnpm workspaces.

## GoDaddy runs: npm install → npm run build → npm start

- Website: https://family-testing.com
- Admin: https://family-testing.com/admin/ (password: fts2026)
EOF

cp "$DEST/README.md" "$ROOT/family-testing-deploy/README.md" 2>/dev/null || true

echo "node_modules/" > "$DEST/.gitignore"
echo ".env" >> "$DEST/.gitignore"

rm -f "$ZIP"
(cd "$DEST" && zip -r "$ZIP" . -x "node_modules/*" -x ".env")

echo "Created $ZIP ($(du -h "$ZIP" | cut -f1))"
