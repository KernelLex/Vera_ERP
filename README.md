# Vera ERP

Custom HR & Business Management System built on ERPNext/Frappe for Vera Enterprises.

---

## FOR CLAUDE CODE — READ THIS FIRST

Before doing any setup or deployment work, ask the user for these. They are **never in this repo**.

### Ask the user before running setup

```
1. MariaDB root password
   → Used in: bench new-site --mariadb-root-password <THIS>

2. Jibble Client ID + Jibble Client Secret
   → Used in: bench --site <site> set-config jibble_client_id "<THIS>"
              bench --site <site> set-config jibble_client_secret "<THIS>"

3. Google Drive service_account.json (full file contents — from their secure vault)
   → Save to: apps/vera_drive/vera_drive/service_account.json  (gitignored)
   → Known public fields:
       project_id:     vera-drive-498117
       client_email:   vera-drive-bot@vera-drive-498117.iam.gserviceaccount.com
       client_id:      104066696251131720998
       private_key_id: 45b378f1c66c523bb0077dc362f3db1b247086d3
   → The private_key field is the secret — ask the user to paste the full JSON

4. Production domain / site name
   → Local dev default: hrms.localhost
   → Production: whatever domain points to the server (e.g. hrms.yourdomain.com)
```

### Already known — do NOT ask

- All user passwords: `Vera@2026`
- Admin login: `owais@veraenterprises.in` (maps to ERPNext `Administrator`)
- Google Drive root folder ID: `1tuZUNAScIAR7IX3sttH6VgKkQNsy5IDu`
- Local dev bench port: **8001** (WSL2 — Hyper-V reserves 8000); production servers use **8000**
- Frontend dev port: **5173** (Vite), proxies `/api/` to ERPNext

### Key files to read for project context

| File | What it contains |
|------|-----------------|
| `apps/hr_client/CLAUDE.md` | Full project context, API contract, all decisions — read before any backend work |
| `apps/hr_client/hr_client/api/` | All Frappe backend API endpoints |
| `apps/hr_client/hr_client/patches/` | Data seed scripts (users, employees, company, holidays) |
| `apps/vera_drive/vera_drive/api.py` | Google Drive endpoints |
| `hr-frontend/src/pages/` | All React page components |
| `hr-frontend/vite.config.ts` | API proxy config |

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
│   │   └── hr_client/patches/   # Data seed scripts — run via setup.sh
│   └── vera_drive/       # Google Drive mirror & document management
├── hr-frontend/          # React SPA (all user-facing UI)
├── setup.sh              # One-command setup (run from inside frappe-bench/)
└── README.md             # This file
```

---

## Fresh Server Setup

Run these steps in order on a clean Ubuntu 22.04 server. Each section tells you which credentials to ask for.

### 1. Server Requirements

- Ubuntu 22.04 LTS
- Minimum 4 GB RAM, 2 vCPU, 40 GB SSD
- Open ports: 22, 80, 443
- Run as a **non-root user** with sudo access (e.g. create user `frappe`)

```bash
# Create a non-root user if needed
sudo adduser frappe
sudo usermod -aG sudo frappe
su - frappe
```

### 2. Install System Dependencies

```bash
sudo apt update && sudo apt upgrade -y

# Core packages — includes wkhtmltopdf for PDF generation
sudo apt install -y python3-dev python3-pip python3-venv \
  redis-server mariadb-server nginx git curl \
  wkhtmltopdf xvfb libfontconfig

# Node.js 18 (required — apt default is too old)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node version is 18+
node --version

# Install bench CLI
pip3 install frappe-bench
```

### 3. Configure MariaDB

```bash
sudo mysql_secure_installation
# Set a root password when prompted — you will need it in the next step

sudo mysql -u root -p -e "
  CREATE USER 'frappe'@'localhost' IDENTIFIED BY 'frappe';
  GRANT ALL PRIVILEGES ON \`_test_%\`.* TO 'frappe'@'localhost';
  FLUSH PRIVILEGES;
"
```

### 4. Initialise Frappe Bench

```bash
bench init --frappe-branch version-15 frappe-bench
cd frappe-bench

# Ask user for: SITE_NAME (e.g. hrms.yourdomain.com), MARIADB_ROOT_PASSWORD
bench new-site <SITE_NAME> \
  --mariadb-root-password <MARIADB_ROOT_PASSWORD> \
  --admin-password Vera@2026

# Install ERPNext
bench get-app --branch version-15 erpnext
bench --site <SITE_NAME> install-app erpnext

# Install HRMS
bench get-app --branch version-15 hrms
bench --site <SITE_NAME> install-app hrms
```

### 5. Clone Vera ERP and Run Setup

```bash
cd ~/frappe-bench/apps
git clone https://github.com/KernelLex/Vera_ERP.git

cd ~/frappe-bench
# This script installs both apps, seeds all data, and runs npm install
bash apps/Vera_ERP/setup.sh <SITE_NAME>
```

`setup.sh` does the following automatically:
- Copies `hr_client` and `vera_drive` into bench
- Installs vera_drive Python dependencies (`google-api-python-client`, `pdfplumber`, etc.)
- Installs both apps into the site
- Runs `bench migrate`
- Seeds: company rename → designations → all 5 user accounts → employees → holidays
- Runs `npm install` in `hr-frontend/`

### 6. Add Credentials (ask user — never stored in repo)

#### Jibble API
```bash
# Ask user for JIBBLE_CLIENT_ID and JIBBLE_CLIENT_SECRET
bench --site <SITE_NAME> set-config jibble_client_id "<JIBBLE_CLIENT_ID>"
bench --site <SITE_NAME> set-config jibble_client_secret "<JIBBLE_CLIENT_SECRET>"
```

#### Google Drive Service Account
```bash
# Ask user to paste the full service_account.json
# Then write it to:
nano apps/vera_drive/vera_drive/service_account.json
# Paste the JSON and save. This file is gitignored — never commit it.
```

The JSON structure (ask user for `private_key`):
```json
{
  "type": "service_account",
  "project_id": "vera-drive-498117",
  "private_key_id": "45b378f1c66c523bb0077dc362f3db1b247086d3",
  "private_key": "<ASK USER — from secure vault>",
  "client_email": "vera-drive-bot@vera-drive-498117.iam.gserviceaccount.com",
  "client_id": "104066696251131720998",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### 7. Build the React Frontend

```bash
cd ~/frappe-bench/apps/Vera_ERP/hr-frontend
npm run build
# Output: hr-frontend/dist/
```

### 8. Nginx + SSL (Production)

```bash
# Let bench configure nginx for ERPNext
sudo bench setup nginx
sudo bench setup supervisor
sudo supervisorctl reread && sudo supervisorctl update

# Configure nginx to also serve the React build
# Add this block inside the ERPNext server block in /etc/nginx/conf.d/frappe-bench.conf
# (or create a separate file)
cat << 'EOF' | sudo tee /etc/nginx/conf.d/vera-react.conf
server {
    listen 80;
    server_name <SITE_NAME>;

    root /home/frappe/frappe-bench/apps/Vera_ERP/hr-frontend/dist;
    index index.html;

    # React SPA — all routes fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api/ and /assets/ to ERPNext
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /assets/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

# Free SSL via Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <SITE_NAME>
```

### 9. Production Mode

```bash
bench --site <SITE_NAME> set-config developer_mode 0
bench --site <SITE_NAME> set-config serve_default_site 1
sudo bench setup production frappe
```

---

## User Accounts

All passwords: `Vera@2026`

| Name | Login Email | ERPNext User | Role |
|------|-------------|-------------|------|
| Owais Ahmed Khan | `owais@veraenterprises.in` | `Administrator` | Admin — full access |
| Maaz | `maazdgr8.mma@gmail.com` | same | Project Manager |
| Manjunath M N | `manju.veraaccnts@outlook.com` | same | Accounts Manager |
| Lookman | `lookman.vera@outlook.com` | same | Accounts Executive |
| Bhagya Shree | `bhagyashree.veraenterprises@outlook.com` | same | Logistics + HR |

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
- **Never** commit `.env*` files
- **Never** commit `site_config.json` or `common_site_config.json`
- **Never** commit `brain.db` — AI session memory
- All server secrets go in `bench set-config` (stored in `sites/*/site_config.json` — gitignored)
- Always check `.gitignore` before `git add`

---

## Auto-Update Cron (Production)

```bash
crontab -e
# Pull and restart at 2 AM daily
0 2 * * * cd ~/frappe-bench/apps/Vera_ERP && git pull origin main \
  && cd ~/frappe-bench && bench --site <SITE_NAME> migrate \
  && bench restart
```

---

## Local Development (WSL2)

Bench runs on port **8001** on the dev machine — Windows Hyper-V reserves port 8000 on WSL2 (this is already set in `Procfile`). On a real Linux server, port 8000 is used instead.

```bash
# Terminal 1
cd ~/frappe-bench && bench start

# Terminal 2
cd ~/hr-frontend && npm run dev
# Frontend: http://localhost:5173
# API proxied to: http://localhost:8001
```

To reset the port for a real server (not WSL2):
```bash
# In ~/frappe-bench/Procfile, change:
#   web: bench serve --port 8001
# to:
#   web: bench serve --port 8000
```
