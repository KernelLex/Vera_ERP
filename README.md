# Vera ERP

Custom HR & Business Management System built on ERPNext/Frappe for Vera Enterprises.

---

## FOR CLAUDE CODE — READ THIS FIRST

Before doing any setup, deployment, or credential work, ask the user for the following. These are **never stored in this repo** — you must collect them each session.

### Credentials to ask for before proceeding

```
1. MariaDB root password
   → Used in: bench new-site --mariadb-root-password <THIS>
   → Ask: "What is the MariaDB root password for this server?"

2. Jibble Client ID
   → Used in: bench --site <site> set-config jibble_client_id "<THIS>"
   → Ask: "What is the Jibble API client_id?"

3. Jibble Client Secret
   → Used in: bench --site <site> set-config jibble_client_secret "<THIS>"
   → Ask: "What is the Jibble API client_secret?"

4. Google Drive service_account.json (full file contents)
   → Saved to: apps/vera_drive/vera_drive/service_account.json  (gitignored)
   → Known non-secret fields already on file:
       project_id:       vera-drive-498117
       client_email:     vera-drive-bot@vera-drive-498117.iam.gserviceaccount.com
       client_id:        104066696251131720998
       private_key_id:   45b378f1c66c523bb0077dc362f3db1b247086d3
   → Ask: "Please paste the full service_account.json contents (from your secure vault)."

5. Site domain / hostname
   → Default for production: hrms.yourdomain.com
   → Default for local dev:  hrms.localhost
   → Ask: "What should the ERPNext site name be?"
```

### What is already set up (no need to ask)

- ERPNext site name for **local dev**: `hrms.localhost`
- ERPNext admin password: `Vera@2026` (all user accounts use this)
- Google Drive root folder ID: `1tuZUNAScIAR7IX3sttH6VgKkQNsy5IDu`
- Bench port on local WSL2 dev machine: **8001** (not 8000 — Hyper-V reserves 8000)
- Frontend dev port: **5173** (Vite), proxies `/api/` to `http://localhost:8001`

### Key files to read for full project context

| File | What it contains |
|------|-----------------|
| `apps/hr_client/CLAUDE.md` | Full project context, API contract, decisions, guardrails — read this for any backend work |
| `apps/hr_client/hr_client/api/` | All Frappe backend endpoint files |
| `apps/vera_drive/vera_drive/api.py` | Google Drive API endpoints |
| `hr-frontend/src/pages/` | All React page components |
| `hr-frontend/src/api/` | Frontend API wrappers |
| `hr-frontend/vite.config.ts` | Proxy config (API base URL) |

---

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
└── README.md             # This file
```

---

## Fresh Server Setup

### 1. Server Requirements

- Ubuntu 22.04 LTS
- Minimum 4 GB RAM, 2 vCPU, 40 GB SSD
- Open ports: 22, 80, 443

### 2. Install Frappe Bench

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-dev python3-pip python3-venv \
  redis-server mariadb-server nginx nodejs npm git curl

pip3 install frappe-bench

bench init --frappe-branch version-15 frappe-bench
cd frappe-bench

# Ask user for: SITE_NAME, DB_PASSWORD
bench new-site <SITE_NAME> \
  --mariadb-root-password <DB_PASSWORD> \
  --admin-password Vera@2026

bench get-app --branch version-15 erpnext
bench --site <SITE_NAME> install-app erpnext

bench get-app --branch version-15 hrms
bench --site <SITE_NAME> install-app hrms
```

### 3. Clone Vera ERP and Install Custom Apps

```bash
cd ~/frappe-bench/apps
git clone https://github.com/KernelLex/Vera_ERP.git

cp -r Vera_ERP/apps/hr_client ~/frappe-bench/apps/
bench --site <SITE_NAME> install-app hr_client

cp -r Vera_ERP/apps/vera_drive ~/frappe-bench/apps/
bench --site <SITE_NAME> install-app vera_drive

bench --site <SITE_NAME> migrate
bench --site <SITE_NAME> clear-cache
```

### 4. Add Credentials (never commit these — always ask the user)

#### Jibble API
```bash
# Ask user for JIBBLE_CLIENT_ID and JIBBLE_CLIENT_SECRET before running
bench --site <SITE_NAME> set-config jibble_client_id "<JIBBLE_CLIENT_ID>"
bench --site <SITE_NAME> set-config jibble_client_secret "<JIBBLE_CLIENT_SECRET>"
```

#### Google Drive Service Account
```bash
# Ask user to paste the full service_account.json contents, then save to:
# apps/vera_drive/vera_drive/service_account.json
# This file is gitignored — never commit it
```

The JSON needs these fields (ask user for the private_key):
```json
{
  "type": "service_account",
  "project_id": "vera-drive-498117",
  "private_key_id": "45b378f1c66c523bb0077dc362f3db1b247086d3",
  "private_key": "<ASK USER>",
  "client_email": "vera-drive-bot@vera-drive-498117.iam.gserviceaccount.com",
  "client_id": "104066696251131720998",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

#### React Frontend (.env.local — local dev only)
```bash
# File: hr-frontend/.env.local  (gitignored)
VITE_API_BASE=
VITE_USE_MOCK=false
```

### 5. Build the React Frontend

```bash
cd ~/frappe-bench/apps/Vera_ERP/hr-frontend
npm install

# Development (hot reload, proxies /api/ to ERPNext)
npm run dev

# Production build
npm run build
```

### 6. Nginx + SSL (Production)

```bash
sudo bench setup nginx
sudo bench setup supervisor
sudo supervisorctl reread && sudo supervisorctl update

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <SITE_NAME>
```

### 7. Production Mode

```bash
bench --site <SITE_NAME> set-config developer_mode 0
bench --site <SITE_NAME> set-config serve_default_site 1
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

## Security Rules

- **Never** commit `service_account.json` — Google Drive private key
- **Never** commit `.env*` files — frontend secrets
- **Never** commit `site_config.json` or `common_site_config.json` — ERPNext DB credentials
- **Never** commit `brain.db` — AI session memory
- All server credentials go in `bench set-config` (stored in `sites/*/site_config.json` which is gitignored)
- Always verify `.gitignore` covers a file before `git add`

---

## Auto-Update (Server Cron)

```bash
crontab -e
# Add:
0 2 * * * cd ~/frappe-bench/apps/Vera_ERP && git pull origin main \
  && bench --site <SITE_NAME> migrate \
  && bench restart
```

---

## Local Development (WSL2)

Bench runs on port **8001** — Windows Hyper-V silently reserves 8000 on WSL2.

```bash
# Terminal 1
cd ~/frappe-bench && bench start

# Terminal 2
cd ~/hr-frontend && npm run dev
# Frontend: http://localhost:5173
# API proxied to: http://localhost:8001
```
