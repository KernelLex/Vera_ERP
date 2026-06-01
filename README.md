# Vera ERP

Custom HR & Business Management System built on ERPNext/Frappe for Vera Enterprises.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | ERPNext v15.104.3 + Frappe v15.105.0 |
| HRMS | Frappe HRMS v15.59.0 |
| HR Backend | `hr_client` custom Frappe app |
| Drive Integration | `vera_drive` custom Frappe app |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Attendance | Jibble API integration |
| Documents | Google Drive API (service account) |

## Repo Structure

```
Vera_ERP/
├── apps/
│   ├── hr_client/        # Frappe backend — HR, Recruitment, Leave, CRM, Expenses
│   └── vera_drive/       # Google Drive mirror & document management
├── hr-frontend/          # React SPA (all user-facing UI)
├── setup.sh              # One-command setup for fresh server
└── README.md             # This file — single source of truth for setup
```

---

## Fresh Server Setup

### 1. Server Requirements

- Ubuntu 22.04 LTS
- Minimum 4 GB RAM
- Minimum 2 vCPU
- Minimum 40 GB SSD
- Open ports: 22, 80, 443

### 2. Install Frappe Bench

```bash
# Install system dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-dev python3-pip python3-venv \
  redis-server mariadb-server nginx nodejs npm git curl

# Install bench CLI
pip3 install frappe-bench

# Initialise bench (version-15 branch)
bench init --frappe-branch version-15 frappe-bench
cd frappe-bench

# Create site
bench new-site hrms.yourdomain.com \
  --mariadb-root-password YOUR_DB_PASSWORD \
  --admin-password Vera@2026

# Install ERPNext
bench get-app --branch version-15 erpnext
bench --site hrms.yourdomain.com install-app erpnext

# Install HRMS
bench get-app --branch version-15 hrms
bench --site hrms.yourdomain.com install-app hrms
```

### 3. Clone Vera ERP and Install Custom Apps

```bash
# Clone this repo
cd ~/frappe-bench/apps
git clone https://github.com/KernelLex/Vera_ERP.git

# Install hr_client
cp -r Vera_ERP/apps/hr_client ~/frappe-bench/apps/
bench --site hrms.yourdomain.com install-app hr_client

# Install vera_drive
cp -r Vera_ERP/apps/vera_drive ~/frappe-bench/apps/
bench --site hrms.yourdomain.com install-app vera_drive

# Run migrations and clear cache
bench --site hrms.yourdomain.com migrate
bench --site hrms.yourdomain.com clear-cache
```

### 4. Build the React Frontend

```bash
cd ~/frappe-bench/apps/Vera_ERP/hr-frontend

# Install dependencies
npm install

# Development (with hot reload)
npm run dev

# Production build
npm run build
```

The Vite dev server proxies all `/api/` calls to ERPNext (configured in `vite.config.ts`).
For production, serve the `dist/` folder behind nginx alongside ERPNext.

### 5. Add Credentials (server-side — NEVER commit these)

#### Jibble API (attendance sync)
```bash
bench --site hrms.yourdomain.com set-config jibble_client_id "YOUR_JIBBLE_ID"
bench --site hrms.yourdomain.com set-config jibble_client_secret "YOUR_JIBBLE_SECRET"
```

#### Google Drive Service Account

Place the service account JSON at:
```
apps/vera_drive/vera_drive/service_account.json
```

This file is in `.gitignore` and must never be committed. Copy it from a secure vault.

The file contains:
- `project_id`: `vera-drive-498117`
- `client_email`: `vera-drive-bot@vera-drive-498117.iam.gserviceaccount.com`
- `client_id`: `104066696251131720998`
- `private_key_id`: `45b378f1c66c523bb0077dc362f3db1b247086d3`
- `private_key`: *(from secure vault)*

#### React Frontend Environment

For local development, create `hr-frontend/.env.local` (already in `.gitignore`):
```
VITE_API_BASE=
VITE_USE_MOCK=false
```

For production, configure nginx to serve the React build at the same domain as ERPNext.

### 6. Nginx + SSL (Production)

```bash
# Let bench configure nginx
sudo bench setup nginx
sudo bench setup supervisor
sudo supervisorctl reread && sudo supervisorctl update

# Free SSL via Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hrms.yourdomain.com
```

### 7. Production Mode

```bash
bench --site hrms.yourdomain.com set-config developer_mode 0
bench --site hrms.yourdomain.com set-config serve_default_site 1
sudo bench setup production frappe
```

---

## User Accounts

All passwords: `Vera@2026`

| Name | Login Email | Role |
|------|-------------|------|
| Owais Ahmed Khan | `owais@veraenterprises.in` (logs in as `Administrator`) | Admin — full access |
| Maaz | `maazdgr8.mma@gmail.com` | Project Manager |
| Manjunath M N | `manju.veraaccnts@outlook.com` | Accounts Manager |
| Lookman | `lookman.vera@outlook.com` | Accounts Executive |
| Bhagya Shree | `bhagyashree.veraenterprises@outlook.com` | Logistics + HR |

---

## Modules Built

| Module | Status | Route |
|--------|--------|-------|
| Auth (login/logout/session) | ✅ Live | `/login` |
| Dashboard | ✅ Live | `/` |
| My Profile (self-edit) | ✅ Live | `/my-profile` |
| Recruitment (Kanban + pipeline) | ✅ Live | `/recruitment` |
| Attendance (Jibble) | ✅ Live | `/admin/attendance` |
| Leave Management | ✅ Live | `/leave` |
| Holidays & Leave Policy | ✅ Live | `/holidays` |
| Expenses | ✅ Live | `/expenses` |
| Accounts / Drive | ✅ Live | `/accounts` |
| CRM (lead pipeline) | ✅ Live | `/crm` |
| Permission Dashboard | ✅ Live | `/admin/permissions` |
| Employee Admin | ✅ Live | `/admin/employees` |
| Performance | 🔜 Planned | — |
| Forms Integration | 🔜 Planned | — |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `apps/hr_client/CLAUDE.md` | Full project context, decisions, API contract |
| `apps/hr_client/hr_client/api/` | All Frappe backend API endpoints |
| `apps/hr_client/mcp-brain/server.py` | AI memory MCP server |
| `apps/vera_drive/vera_drive/api.py` | Drive API endpoints |
| `apps/vera_drive/vera_drive/google_drive.py` | Drive sync logic |
| `hr-frontend/src/pages/` | All React page components |
| `hr-frontend/src/api/` | Frontend API call wrappers |
| `hr-frontend/src/context/` | Auth + Permissions context |

---

## Security Notes

- **Never** commit `service_account.json` — Google Drive credentials
- **Never** commit `.env*` files — frontend secrets
- **Never** commit `site_config.json` — ERPNext site credentials
- **Never** commit `brain.db` — AI session data
- All credentials go in `bench set-config` (stored in `sites/*/site_config.json` which is gitignored)
- See `apps/hr_client/CLAUDE.md` for full security guardrails

---

## Auto-Update (Server Cron)

```bash
# Add to server crontab — pulls and restarts at 2 AM daily
crontab -e

0 2 * * * cd ~/frappe-bench/apps/Vera_ERP && git pull origin main \
  && bench --site hrms.localhost migrate \
  && bench restart
```

---

## Local Development (WSL2)

Bench runs on port **8001** (not 8000) on this dev machine — Windows Hyper-V reserves port 8000 on WSL2.

```bash
# Start bench
cd ~/frappe-bench && bench start

# Start frontend dev server (separate terminal)
cd ~/hr-frontend && npm run dev
# Frontend at: http://localhost:5173
# API proxied to: http://localhost:8001
```
