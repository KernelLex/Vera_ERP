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
BENCH_DIR="$(pwd)"

echo "Site:      $SITE_NAME"
echo "Repo:      $SCRIPT_DIR"
echo "Bench dir: $BENCH_DIR"
echo ""

# ── 1. Copy custom apps into bench ───────────────────────────────────────────
echo "[1/7] Copying hr_client into bench..."
if [ -d "./apps/hr_client" ]; then
  echo "  hr_client already exists — pulling latest files..."
  rsync -a --exclude='.git' "$SCRIPT_DIR/apps/hr_client/" ./apps/hr_client/
else
  cp -r "$SCRIPT_DIR/apps/hr_client" ./apps/
fi

echo "[1/7] Copying vera_drive into bench..."
if [ -d "./apps/vera_drive" ]; then
  echo "  vera_drive already exists — pulling latest files..."
  rsync -a --exclude='.git' "$SCRIPT_DIR/apps/vera_drive/" ./apps/vera_drive/
else
  cp -r "$SCRIPT_DIR/apps/vera_drive" ./apps/
fi

# ── 2. Install vera_drive Python dependencies ────────────────────────────────
echo "[2/7] Installing vera_drive Python dependencies..."
./env/bin/pip install -r ./apps/vera_drive/requirements.txt --quiet

# ── 3. Install apps into site ─────────────────────────────────────────────────
echo "[3/7] Installing hr_client..."
bench --site "$SITE_NAME" install-app hr_client

echo "[3/7] Installing vera_drive..."
bench --site "$SITE_NAME" install-app vera_drive

# ── 4. Run migrations ─────────────────────────────────────────────────────────
echo "[4/7] Running migrations..."
bench --site "$SITE_NAME" migrate

# ── 5. Seed data (company, users, employees, designations, holidays) ──────────
echo "[5/7] Seeding Vera Enterprises data..."
echo "  → Renaming company..."
bench --site "$SITE_NAME" execute hr_client.patches.rename_company.execute 2>/dev/null || echo "  (company already set)"

echo "  → Creating designations..."
bench --site "$SITE_NAME" execute hr_client.patches.create_designations.execute

echo "  → Creating user accounts..."
bench --site "$SITE_NAME" execute hr_client.patches.create_all_users.execute

echo "  → Creating employees..."
bench --site "$SITE_NAME" execute hr_client.patches.create_employees.execute

echo "  → Filling employee contact data..."
bench --site "$SITE_NAME" execute hr_client.patches.fill_employee_data.execute 2>/dev/null || echo "  (skipped)"

echo "  → Creating 2026 holiday list..."
bench --site "$SITE_NAME" execute hr_client.patches.create_holidays_2026.execute

# ── 6. Clear cache ────────────────────────────────────────────────────────────
echo "[6/7] Clearing cache..."
bench --site "$SITE_NAME" clear-cache

# ── 7. Frontend setup ─────────────────────────────────────────────────────────
echo "[7/7] Installing frontend dependencies..."
cd "$SCRIPT_DIR/hr-frontend"
npm install

echo ""
echo "======================================"
echo "  Setup Complete!"
echo ""
echo "  REQUIRED — add credentials before starting:"
echo ""
echo "  1. Jibble API (for attendance sync):"
echo "     bench --site $SITE_NAME set-config jibble_client_id \"YOUR_ID\""
echo "     bench --site $SITE_NAME set-config jibble_client_secret \"YOUR_SECRET\""
echo ""
echo "  2. Google Drive service account:"
echo "     Copy service_account.json to:"
echo "     $BENCH_DIR/apps/vera_drive/vera_drive/service_account.json"
echo "     (get the file from your secure vault — never commit it)"
echo ""
echo "  THEN start the system:"
echo "     Terminal 1: cd $BENCH_DIR && bench start"
echo "     Terminal 2: cd $SCRIPT_DIR/hr-frontend && npm run dev"
echo "     Frontend:   http://localhost:5173"
echo ""
echo "  For production build:"
echo "     cd $SCRIPT_DIR/hr-frontend && npm run build"
echo "======================================"
