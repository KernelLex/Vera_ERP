#!/bin/bash
# Vera ERP — One Command Setup Script
# Usage: bash setup.sh [site-name]
# Example: bash setup.sh hrms.yourdomain.com

set -e  # Stop on any error

echo "======================================"
echo "  Vera ERP Setup Script"
echo "======================================"

# Must be run from inside frappe-bench root
if [ ! -f "env/bin/python" ]; then
  echo "ERROR: Run this script from inside your frappe-bench directory."
  echo "  cd ~/frappe-bench && bash apps/Vera_ERP/setup.sh"
  exit 1
fi

SITE_NAME=${1:-"hrms.localhost"}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Site: $SITE_NAME"
echo "Repo: $SCRIPT_DIR"
echo ""

# 1. Copy apps into bench
echo "[1/5] Copying hr_client into bench..."
cp -r "$SCRIPT_DIR/apps/hr_client" ./apps/ 2>/dev/null || echo "  (already exists, skipping copy)"

echo "[1/5] Copying vera_drive into bench..."
cp -r "$SCRIPT_DIR/apps/vera_drive" ./apps/ 2>/dev/null || echo "  (already exists, skipping copy)"

# 2. Install apps into site
echo "[2/5] Installing hr_client..."
bench --site "$SITE_NAME" install-app hr_client

echo "[2/5] Installing vera_drive..."
bench --site "$SITE_NAME" install-app vera_drive

# 3. Run migrations
echo "[3/5] Running migrations..."
bench --site "$SITE_NAME" migrate

# 4. Clear cache
echo "[4/5] Clearing cache..."
bench --site "$SITE_NAME" clear-cache

# 5. Frontend setup
echo "[5/5] Installing frontend dependencies..."
cd "$SCRIPT_DIR/hr-frontend"
npm install

echo ""
echo "======================================"
echo "  Setup Complete!"
echo ""
echo "  NEXT STEPS:"
echo "  1. Add credentials (see README.md §5)"
echo "     - Jibble: bench set-config jibble_client_id ..."
echo "     - Google Drive: copy service_account.json to"
echo "       apps/vera_drive/vera_drive/service_account.json"
echo ""
echo "  2. Start development:"
echo "     Terminal 1: cd ~/frappe-bench && bench start"
echo "     Terminal 2: cd hr-frontend && npm run dev"
echo ""
echo "  3. Production build:"
echo "     cd hr-frontend && npm run build"
echo "======================================"
