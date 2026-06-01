# ClientERP — Master Context
_Last updated: 2026-06-02_

## INSTRUCTIONS FOR CLAUDE (READ FIRST)
You are working on a custom ERPNext v15 + Frappe HRMS system.
At the end of EVERY session you MUST:
1. Move completed tasks to "What's been built" with ✅
2. Update "In progress" with what you left off at
3. Update "What's next" with remaining tasks
4. Add new decisions to "Decisions made"
5. Add new guardrails to "DO NOT DO"
Do this automatically without being asked.

## Project
Full ERP system for a client built on ERPNext v15 + Frappe HRMS.
Starting with HR module — Forms Integration first.
Will expand to full ERP over time.

## Stack
- ERPNext v15 + Frappe HRMS
- Custom apps: hr_client (extends HRMS, never modifies core), vera_drive (Google Drive integration)
- React + Vite + Tailwind + shadcn/ui (frontend)
- Jibble API (attendance sync)
- WSL2 local → Linux server production

## Site & Commands
- Site: hrms.localhost
- Bench: ~/frappe-bench/
- Custom app: ~/frappe-bench/apps/hr_client/
- Drive app: ~/frappe-bench/apps/vera_drive/
- Frontend: ~/hr-frontend/
- Start bench: cd ~/frappe-bench && bench start
- Clear cache: bench --site hrms.localhost clear-cache
- Migrate: bench --site hrms.localhost migrate
- Console: bench --site hrms.localhost console
- Restart: bench --site hrms.localhost migrate && bench --site hrms.localhost clear-cache

## ERPNext Rules (CRITICAL)
- NEVER modify files in apps/frappe/ or apps/erpnext/ or apps/hrms/
- ALWAYS extend via hr_client custom app only
- ALWAYS use Custom Fields for extending existing DocTypes
- ALWAYS run bench migrate after any DocType change
- ALWAYS run bench clear-cache after any change
- ALWAYS whitelist API methods with @frappe.whitelist()
- NEVER hardcode site name — use frappe.local.site
- ALWAYS handle frappe.exceptions properly in API methods

## Account 1 — BACKEND (this instance)
Owns: ~/frappe-bench/apps/hr_client/
- DocTypes, APIs, hooks, Jibble sync
- Writes API-Contract section below
- NEVER touches ~/hr-frontend/

## Account 2 — FRONTEND (other instance)
Owns: ~/hr-frontend/
- React components, forms, UI
- Reads API-Contract section only
- NEVER touches ~/frappe-bench/apps/hr_client/

## Modules to build (in order)
1. Forms Integration (MS Forms → ERPNext) ← START HERE
2. Recruitment
3. Employee Lifecycle
4. Performance Management
5. Attendance & Leave (Jibble)
6. Expense Management

## Current Sprint
_Sprint 2 — Employee Profiles + Lifecycle | Started: 2026-05-14_

### Goal
Employee profile pages live (done). Next: wire Employee Lifecycle to real data, then Forms Integration.

### IMPORTANT: DocType path convention (learned during build)
DocTypes MUST live in `hr_client/hr_client/hr_client/doctype/<name>/` — NOT `hr_client/hr_client/doctype/`.
Frappe resolves the module folder by importing `hr_client.hr_client` and uses that as the base path.

### Recruitment Module — FULLY DONE ✅
- ✅ F-R1–F-R9: All recruitment frontend built and wired to real API
- ✅ F-JD1–F-JD6: AI Job Description Generator (ON HOLD — AI provider needed)
- ✅ Designation + Department dropdowns locked to Vera roles only (no free-text allowed)
- ✅ 15 total endpoints in `hr_client/api/recruitment.py` (added close_job_opening, delete_job_opening)
- ✅ RecruitmentPage redesigned as job card listing (not kanban-first); PipelinePage at `/recruitment/pipeline/:id`
- ✅ Owais-only: "+ Post New Job" button, close (X) and delete (trash) controls on each card
- ✅ Dummy job HR-OPN-2026-0001 removed from DB

### Employee Profile System — DONE ✅
- ✅ `hr_client/api/employee.py` — 5 endpoints (get_employee_profile, update_own_profile, admin_update_profile, upload_profile_photo, get_all_employees)
- ✅ `/my-profile` — self-view/edit for all users
- ✅ `/employee/profile/:id` — admin full view/edit
- ✅ `/admin/employees` — admin team cards grid
- ✅ 4 custom Employee fields: custom_aadhaar_number, custom_pan_number, custom_ifsc_code, custom_skills

### Employee Lifecycle — BACKEND DONE, FRONTEND PARTIAL
- ✅ B-EL1–B-EL4: All backend endpoints built and deployed
- ✅ F-EL2–F-EL5, F-EL8: Frontend components built
- [ ] F-EL1: Wire TypeScript types to real API shapes
- [ ] F-EL6: OnboardingDrawer — right sheet with stepper + checklists
- [ ] F-EL7: ExitModal + ExitInterviewForm
- [ ] F-EL9: Wire to real API (VITE_USE_MOCK=false for lifecycle)

### Forms Integration — NOT STARTED
- [ ] B-F1: Form Template DocType
- [ ] B-F2: Form Submission DocType
- [ ] B-F3: `hr_client/api/forms.py` — 5 endpoints
- [ ] B-F4: CORS + auth config in hooks.py
- [ ] B-F5: Seed test Form Template
- [ ] F-F3–F-F6: Frontend form pages

---

## MCP Brain Server

**Location:** `apps/hr_client/mcp-brain/server.py`
**Config:** `~/frappe-bench/.claude/settings.json` (project root — this is where Claude Code loads MCP config from)
**Tools:** `get_project_status_tool`, `get_task_tool`, `update_task_tool`, `get_api_contract_tool`, `get_rules_tool`, `get_decisions_tool`, `log_decision_tool`, `get_last_session_tool`, `update_session_tool`, `add_blocker_tool`, `get_blockers_tool`, `resolve_blocker_tool`

**Key fix (2026-04-26):** MCP config was in `apps/hr_client/.claude/settings.json` — wrong location. Moved to `~/frappe-bench/.claude/settings.json`. Restart Claude Code after any config change for MCP to reload.

---

## What's been built
✅ **Employee Lifecycle 500 Fix — Wrong ERPNext Field Names (2026-05-15)**
- **Root cause:** `get_employee_detail` used `emp.emergency_contact_name` and `emp.emergency_contact_phone` — fields that DO NOT exist on ERPNext's Employee DocType. `EmployeeMaster` (HRMS) overrides `__getattr__` and raises `AttributeError` for unknown attributes (unlike plain `frappe.Document` which returns `None`).
- **Fix:** Changed to `getattr(emp, "person_to_be_contacted", None)` and `getattr(emp, "emergency_phone_number", None)`. Used `getattr` defensively so future HRMS upgrades don't re-introduce 500s. JSON response keys kept identical (`emergency_contact_name`, `emergency_contact_phone`) — no frontend changes needed.
- All 5 employees now return 200 from `get_employee_detail`. Verified via `bench execute`.

✅ **Employee Profile Lookup Fix — ID + Email (2026-05-15)**
- **Root cause:** `get_employee_profile` checked permission (`email != frappe.session.user`) BEFORE resolving the identifier. When called with `HR-EMP-00005`, the comparison always failed for non-admins even when viewing their own profile.
- **Fix:** Resolve identifier to `emp_name` FIRST (direct name → user_id → company_email → personal_email), THEN compare the employee's actual emails against `frappe.session.user` for permission check.
- **Lookup order now:** `frappe.db.exists("Employee", identifier)` → `_get_employee_by_email(identifier)` — handles both employee IDs and email addresses.
- **Admin alias preserved:** `_ADMIN_EMAIL_MAP` still applied before any lookup.
- Backend in `hr_client/api/employee.py`; no frontend changes needed.

✅ **Jibble Endpoint Fix + Date Range Picker (2026-05-15)**
- **Root cause of 404:** `/v1/Timesheets` does not exist in this Jibble org. Correct endpoint is `/v1/TimeEntries`.
- **Filter syntax (critical):** `belongsToDate` is OData `Edm.Date` — must use **no quotes** around date literal: `belongsToDate eq 2026-05-14` (NOT `'2026-05-14'`). String quotes cause HTTP 400.
- **Jibble timestamp quirk:** `localTime` field uses 4-digit fractional seconds (e.g. `.6514`) — Python 3.10 `fromisoformat` fails. Fixed via regex normalisation to 6-digit microseconds before parsing.
- **WhoIsWorkingNow:** `/v1/WhoIsWorkingNow` replaces broken `?$filter=status eq 'ClockedIn'` on People.
- **TimeEntries structure:** Each record = one In or Out event. `type: "In"|"Out"`, `localTime` (ISO+TZ), `belongsToDate` (YYYY-MM-DD), `personId`.
- **People field name:** `fullName` (not `name`) on People records.
- **Unfiltered queries return 0** — Jibble requires a date filter; `$top`/`$orderby` without filter returns empty.
- Per-day cache (`jibble_ts_{date}`): 300s TTL for today, 3600s for past days. Bust-cache endpoint added.
- New endpoints: `get_attendance_range(date_from, date_to)`, `get_absent_by_date(date)`, `bust_cache(date_from, date_to)`
- Frontend: Date range picker with Today/Yesterday/Last 3 Days/Last 7 Days/Custom presets. Default: Last 3 Days.
- Frontend: Attendance table now groups by date (most recent first) with section headers.
- Frontend: "Last synced" timestamp + manual Refresh button (busts cache + refetches).
- Custom date picker: max 30-day range enforced in both backend and frontend.

✅ **Jibble Full API Integration — Admin Dashboard (2026-05-15)**
- Credentials stored in site config: `jibble_client_id`, `jibble_client_secret` — never in code
- `hr_client/api/jibble.py` — 12 endpoints (11 required + `test_connection`):
  - `get_people`, `get_whos_in`, `get_attendance_today`, `get_weekly_summary`, `get_monthly_summary`
  - `get_tracked_time_report`, `get_activities`, `get_projects`
  - `get_late_today` (computed: clock in after 09:30 IST), `get_absent_today` (cross-reference), `get_overtime` (>9h/day)
  - `test_connection` (force-refresh token, verify API reachable)
- Bearer token cached in `frappe.cache()` with 3500s TTL; auto-refreshes on 401
- All endpoints admin-only: checks `frappe.session.user in {"owais@veraenterprises.in", "Administrator"}`
- React: `src/pages/admin/attendance/useJibble.ts` — 11 hooks (React Query, 60s auto-refresh for live widgets)
- React: `src/pages/admin/attendance/AttendancePage.tsx` — full 10-widget page at `/admin/attendance`
  - Widget 1+2: Live Status Bar + Who's In (green/grey dots, clocked-in cards, live timer)
  - Widget 3: Today's Full Attendance Table (Clock In/Out, Hours, Break, Status badges)
  - Widget 4+5: Late Arrivals + Absent Today (empty states with emoji)
  - Widget 6: Weekly Hours Bar Chart (recharts, 45h target line, green/amber/red bars)
  - Widget 7: Monthly Summary Table + CSV export button
  - Widget 8: Overtime Alerts (per-person overtime days this month)
  - Widget 9: Projects Pie Chart (recharts, hours per project)
  - Settings Panel: Test Connection button, status indicator, org name
- Sidebar: "Attendance" nav item enabled, admin-only, routes to `/admin/attendance`
- Dashboard: "Live Attendance" quick action button added for admin
- recharts installed

✅ **Recruitment Designation Cleanup — Confirmed & Frontend Fixed (2026-05-14)**
- Verified: ERPNext DB has ONLY the 8 Vera designations (cleanup from prior session worked correctly)
- Fixed existing Job Opening HR-OPN-2026-0001 that had stale "Vice President" designation → reassigned to "Manager"
- Added `get_designations` and `get_departments` endpoints to `recruitment.py`
- Added `useDesignations()` and `useDepartments()` hooks to `useRecruitment.ts`
- `CreateJobOpeningModal`: Designation field changed from free-text Input → Select dropdown (loads from API); Department field same
- `AIJobDescriptionGenerator`: Same fix — both designation and department now load from API, no free-text allowed
- Build passes clean ✅

✅ **Recruitment Cleanup + Employee Profiles + Self-Edit (2026-05-14)**
- Deleted 29 default ERPNext designations — only 8 Vera roles remain (Manager, Project Manager, Accounts Manager, Accounts Executive, GST & TDS Specialist, Logistics Manager, Stock Monitor, Porter Executive)
- Added 4 custom Employee fields via fixtures: `custom_aadhaar_number`, `custom_pan_number`, `custom_ifsc_code`, `custom_skills` — migrated ✅
- `hr_client/api/employee.py` — 5 whitelisted endpoints: `get_employee_profile`, `update_own_profile`, `admin_update_profile`, `upload_profile_photo`, `get_all_employees`
- React: `/my-profile` → `EmployeeProfilePage` (self-view/edit, all 6 sections)
- React: `/employee/profile/:id` → same page with admin context (can edit locked fields, see Aadhaar/PAN)
- React: `/admin/employees` → `AdminEmployeesPage` (5 employee cards with hover "View Full Profile")
- Sidebar updated: "My Profile" for all users; "Team" admin-only nav item; renamed sidebar header to "Vera ERP"
- Self-edit fields: photo, personal email, cell, emergency contact, address, blood group, bank details, skills
- Locked fields (non-editable by employee): Employee ID, Designation, Department, Date of Joining, Work Email, Reporting Manager, Aadhaar, PAN uploads

✅ **ERPNext Employee Setup (2026-05-14)**
- Company renamed from `valance` → `Vera Enterprises` (abbreviation V, departments use ` - V` suffix)
- Created 6 custom Designations: Accounts Manager, Accounts Executive, GST & TDS Specialist, Logistics Manager, Stock Monitor, Porter Executive
- Created 2 new Departments: Project - V, Logistics - V (Management - V, Accounts - V already existed)
- Created 5 Employee records (HR-EMP-00001 through HR-EMP-00005) for all Vera team members, linked to their User accounts, status Active

✅ **Full Real-Data Wiring — Mock Mode OFF (2026-05-14)**
- `VITE_USE_MOCK=false`, `VITE_API_BASE=` (empty) in `.env.local` — all calls go through Vite proxy
- ERPNext is shadow backend only — users never see the desk, only the React wrapper
- `hr_client/api/dashboard.py` — `get_dashboard_stats`: live counts (employees, open positions, candidates this month, interviews today) + recent activity from Job Applicant / Interview / Job Offer
- `hr_client/api/employee_lifecycle.py` — all 8 endpoints now exist and call real ERPNext Employee data: `get_employees`, `get_employee_detail`, `get_onboarding_checklist`, `get_exit_details`, `update_onboarding_stage`, `create_employee`, `submit_resignation`, `submit_exit_interview`, `send_welcome_email`
  - Gracefully handles missing custom fields (custom_onboarding_stage, documents_checklist, it_setup_checklist) — returns sensible defaults until B-EL1 is run
  - Employee Exit endpoints return early with error if DocType table doesn't exist yet
- `Dashboard.tsx` fully rewritten — no hardcoded data:
  - `useDashboardStats` hook calls real API
  - Loading skeletons while fetching
  - Empty state on Recent Activity if no events yet
  - Greeting uses logged-in user's first name
  - Role Control button visible to admin only
- TypeScript build passes clean ✅

✅ **Permission Dashboard v2 — All Access by Default (2026-05-14)**
- New DocType: `User Module Permission` at `hr_client/hr_client/hr_client/doctype/user_module_permission/`
  - Fields: `user` (Link→User, unique), + 8 Check fields defaulting to 1: recruitment, employee_lifecycle, accounts, projects, logistics, hr, attendance, expense
  - Migrated successfully — table exists in DB
- All 4 non-admin users now have ALL ERPNext roles: HR Manager, HR User, Accounts Manager, Accounts User, Projects User, Stock Manager, Stock User, Expense Approver, Employee, Leave Approver
- `hr_client/api/permissions.py` — updated with v2 endpoints + legacy v1 shims:
  - `get_all_users_with_permissions` — all 5 team members, all permissions default true, tested via `bench execute` ✅
  - `update_user_permissions(email, permissions: JSON)` — persists to User Module Permission DocType, Admin-only
  - `get_users_with_roles` + `update_user_roles` — kept as legacy shims delegating to v2
- React Permission Dashboard v2: route `/admin/permissions`
  - 8 permission modules with emoji icons: recruitment👥, employee_lifecycle🔄, accounts📊, projects📋, logistics📦, hr🏢, attendance🕐, expense💳
  - 4-column grid toggle layout; enabled count shown (e.g. "8/8")
  - Clicking entire toggle tile toggles the switch
  - Save button shows ✓ Saved (green) for 3s after success, then resets
  - Owais card: "Full Access" badge, purple ring border, all toggles locked, "Administrator — permissions cannot be modified" footer
  - `src/pages/admin/permissions/usePermissions.ts` — new hooks for v2 endpoints
  - TypeScript build passes clean ✅
- Dashboard: "Role Control" button added to Quick Actions panel (visible to admin only, purple styled), navigates to `/admin/permissions`
- `src/components/ui/switch.tsx` — CSS toggle (no Radix dependency needed)

✅ **Recruitment Backend (2026-04-20)**
- `Job Opening Interview Round` child DocType (in `hr_client/hr_client/hr_client/doctype/`)
- 5 Custom Fields on Job Applicant (`custom_pipeline_stage`, `custom_current_interview_round`, `custom_rejection_reason`, `custom_internal_notes`) and Job Opening (`custom_interview_rounds`)
- `hr_client/api/recruitment.py` — 11 whitelisted endpoints + 4 doc_event handlers
- `hooks.py` — CORS, fixtures, doc_events
- All tested and working via bench console

✅ **Frontend Scaffold + Recruitment UI (2026-04-20)**
- Vite 5 + React + TypeScript + Tailwind CSS v3 + shadcn/ui (base-ui)
- `src/lib/api.ts` — Axios wrapper, `VITE_API_BASE` env var, `withCredentials`
- `src/lib/utils.ts` — `cn()` helper
- `src/lib/dateUtils.ts` — `formatDistanceToNow`, `formatDate`
- `src/components/layout/Sidebar.tsx` — Odoo-style dark sidebar, 6 nav items
- `src/components/layout/TopBar.tsx` — avatar + logout dropdown
- `src/components/layout/Layout.tsx` — shell with mobile Sheet sidebar
- `src/pages/Login.tsx` — login form connecting to Frappe `/api/method/login`
- `src/pages/Dashboard.tsx` — placeholder
- `src/pages/recruitment/types.ts` — TypeScript types for all shapes
- `src/pages/recruitment/mockData.ts` — realistic mock for all 6 pipeline stages (11 candidates)
- `src/pages/recruitment/hooks/useRecruitment.ts` — React Query hooks (VITE_USE_MOCK flag)
- `src/pages/recruitment/components/KanbanBoard.tsx`
- `src/pages/recruitment/components/KanbanColumn.tsx` — stage-color-coded columns
- `src/pages/recruitment/components/CandidateCard.tsx` — star rating, source, days-ago
- `src/pages/recruitment/components/JobOpeningsSidebar.tsx` — left panel, closed section collapsible
- `src/pages/recruitment/components/CandidateDetailDrawer.tsx` — right Sheet, 4 tabs (Overview/Interviews/Offer/Notes)
- `src/pages/recruitment/components/AddCandidateModal.tsx`
- `src/pages/recruitment/components/CreateJobOpeningModal.tsx` — with interview rounds builder
- `src/pages/recruitment/components/ScheduleInterviewModal.tsx`
- `src/pages/recruitment/components/RejectCandidateModal.tsx`
- `src/pages/recruitment/RecruitmentPage.tsx` — routes `/recruitment` and `/recruitment/:jobOpening`
- `src/App.tsx` — BrowserRouter + React Query provider + all routes
- `npm run build` passes clean (TypeScript + Vite)
- Now wired to real API (`VITE_USE_MOCK=false`). Designation + Department dropdowns load from `get_designations` / `get_departments` endpoints

✅ **Bug fixes (2026-04-20)**
- **Bug 1:** Deduplicated `allOpenings` array in `JobOpeningsSidebar` (mock returns all items for every status query, causing duplicates); added unique keys `${job.name}-${index}`.
- **Bug 2/3:** Removed `Button` component from `render={}` prop in both `dialog.tsx` and `sheet.tsx` close buttons — replaced with plain styled `DialogPrimitive.Close` to avoid React ref forwarding warnings.
- **Bug 4:** Added `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to `BrowserRouter` in `App.tsx`.

✅ **UI fixes (2026-04-20)**
- **Issue 1 (Dashboard):** Built full dashboard — greeting header, 4 stat cards, Recent Activity feed, Quick Actions panel. File: `src/pages/Dashboard.tsx`.
- **Issue 2 (Drawer):** Replaced fixed Sheet with an inline `absolute` panel inside a `relative` parent in `RecruitmentPage.tsx`. Drawer slides in from right of the kanban area only — sidebar is never covered. Dark overlay (`bg-black/40`) scoped to content area. File: `src/pages/recruitment/components/CandidateDetailDrawer.tsx`, `src/pages/recruitment/RecruitmentPage.tsx`.
- **Issue 3 (Modal):** Changed `DialogOverlay` from `bg-black/10` to `bg-black/50`; changed `DialogContent` popup from `bg-popover` to explicit `bg-white shadow-xl`. File: `src/components/ui/dialog.tsx`.
- **Issue 4 (Sidebar):** Removed `hidden md:flex` wrapper — sidebar now always rendered. Mobile hamburger + Sheet only shown on `lg:hidden`. File: `src/components/layout/Layout.tsx`.

✅ **UI fixes round 2 (2026-04-20)**
- **Issue 1 (Vertical line):** `CandidateDetailDrawer` now conditionally mounted (`{selectedCandidate && ...}`) — no always-present `border-l` DOM node. File: `src/pages/recruitment/RecruitmentPage.tsx`.
- **Issue 2 (Card fill):** Dashboard stat/activity/actions cards now use `bg-white shadow-md ring-0 border-0` — bypasses broken `bg-card` CSS variable. File: `src/pages/Dashboard.tsx`.
- **Issue 3 (Floating X):** Sheet-based mobile sidebar removed from Layout — replaced with single collapsible sidebar pattern, eliminating stray SheetTrigger from DOM.
- **Issue 4 (Sidebar toggle):** Layout has `useState(true)` for `sidebarOpen`; `Sidebar` accepts `open` prop and transitions `w-56`↔`w-0` with `duration-300`; TopBar hamburger calls `onToggleSidebar`. Files: `src/components/layout/Layout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`.
- **Issue 5 (Design depth):** Active sidebar nav uses `bg-blue-600 text-white`; TopBar has `shadow-sm border-gray-200`.

✅ **Auth flow + Login redesign (2026-04-20)**
- `src/api/auth.ts` — `loginUser`, `logoutUser`, `getCurrentUser`, `storeUser`, `clearUser`; mock-aware (`VITE_USE_MOCK`); user persisted to `localStorage`.
- `src/context/AuthContext.tsx` — `AuthProvider` with `user`, `isLoggedIn`, `isLoading`, `login()`, `logout()`; logout uses `window.location.replace("/login")` (not React Router `navigate`) to avoid race condition where `PublicOnlyRoute` still sees old `isLoggedIn=true` and bounces user back.
- `src/components/auth/ProtectedRoute.tsx` — `ProtectedRoute` (spinner while loading, redirect to `/login` if not auth) and `PublicOnlyRoute` (spinner while loading, redirect to `/` if already logged in).
- `src/pages/Login.tsx` — split-screen redesign: left `bg-slate-900` panel with logo + "Welcome back" + 3 feature bullets; right `bg-white` with labeled email/password fields, show/hide password toggle, blue Sign In button with inline spinner, red error message.
- `src/components/layout/TopBar.tsx` — shows user initials (up to 2 letters) in `bg-blue-600` avatar; dropdown shows full_name + email + separator + "Sign Out" that triggers logout.
- `src/App.tsx` — `AuthProvider` wraps all routes inside `BrowserRouter`; protected routes use `ProtectedRoute`, `/login` uses `PublicOnlyRoute`; catch-all `path="*"` inside protected layout redirects unknown URLs to `/`; no raw Frappe JSON ever shown.

**Key gotcha logged:** Never use `navigate("/login")` immediately after `setUser(null)` in the same tick — `PublicOnlyRoute` reads stale `isLoggedIn=true` and bounces the user back, causing an infinite redirect. Use `window.location.replace("/login")` for logout redirects.

✅ **AI Job Description Generator (2026-04-20)**
- `src/pages/recruitment/components/AIJobDescriptionGenerator.tsx` — 3-step flow: Input (textarea + gradient Generate button) → Loading (animated dark gradient with cycling messages) → Review (split 60/40 panel: JD preview with per-section inline edit + job details form)
- `JDSectionBlock` — each section has hover Edit pencil, inline textarea with auto-resize, Save/Cancel check/X buttons; content rendered via `react-markdown`
- Bottom action bar: Download PDF (pure jsPDF, no html2canvas), Copy Share Link (clipboard API + sonner toast), Save & Create Opening (purple-blue gradient button)
- `mockGenerateJD()` in `mockData.ts` — 3.5s async mock, regex title extraction, 7-section JD
- 3 new hooks: `useGenerateJD`, `useSaveJD`, `useExportJDPdf`
- New types: `JDSection`, `JDGenerateInput`, `JDGenerateResult`, `JDFormDetails`, `GeminiJDRaw`
- `AIJobDescriptionGenerator` replaces `CreateJobOpeningModal` as `+ New Job Opening` entry point in `RecruitmentPage.tsx`
- "Fill manually" link skips to old `CreateJobOpeningModal`; error state auto-shows fallback
- Installed: `jspdf`, `html2canvas`, `react-markdown`
- TypeScript clean, production build passes

✅ **AI JD Generator — OpenAI + Professional PDF (2026-04-20)**
- `callOpenAI()` — `fetch` to `gpt-4o-mini` using `VITE_OPENAI_API_KEY`; `response_format: json_object` forces clean JSON (no fence-stripping needed); ~3s, ~$0.0002/call
- Switched from Gemini (free tier quota exhausted) to OpenAI gpt-4o-mini
- `generatePDF()` — pure jsPDF layout: dark navy header + job title + metadata; blue accent line; per-section blue left-border accent; two-column layout for Responsibilities/Qualifications and Nice-to-Have/What-We-Offer; paginated footer
- `buildPdfData()` — merges edited section content back to arrays for PDF; `sectionToArray()` strips markdown bullet prefixes
- Loading screen: 5 messages cycling every 2s; spinning purple→blue SVG gradient ring
- Error handling: `toast.error()` with actual error message (8s duration) + auto-return to input
- API key never logged; `.env` in `.gitignore`; old exposed key revoked immediately
- TypeScript clean, production build passes

✅ **CRM Pipeline — All Employees, Admin Approval Flow (2026-05-15)**
- **Access model:** CRM visible to ALL employees (not admin-only). Any employee can create leads and request stage advances. Owais approves/rejects stage moves.
- 4 DocTypes in `hr_client/hr_client/hr_client/doctype/`:
  - `Vera CRM Lead` (autoname `VCL-.YYYY.-.####`) — lead_title, company_name, contact_person, phone, email, service_interest, source, notes, status (Lead→Discussion→Quotation→Order→Delivery→Success→Failed, default: Lead), rejection_reason, assigned_to, `approval_status` (default: **Approved**), `stage_push_requested` (Check, default 0)
  - `Vera CRM Quotation` (autoname `VCQ-.YYYY.-.####`) — lead, quotation_number, items (child table), subtotal/tax/total, validity_days, terms_and_conditions, pdf_attachment, notes
  - `Vera CRM Quotation Item` (child table, `istable:1`) — item_description, quantity, unit_price, amount
  - `Vera CRM Approval Request` (autoname `VCAR-.YYYY.-.####`) — lead + full snapshot (lead_title, company_name, contact_person, phone, email, service_interest), current_stage, requested_stage, requested_by, requested_by_name, request_notes, approval_status (Pending/Approved/Rejected), admin_notes, reviewed_by, reviewed_on
- Migrated + cache-cleared ✅
- Backend: `hr_client/api/crm.py` — 10 endpoints:
  - `get_all_leads` — all leads to all employees, includes `assigned_to_name` and `pending_approval` per lead
  - `get_lead` — full detail + `approval_history` + `pending_approval` + `quotation`
  - `create_lead` — any employee, sets `approval_status=Approved`, `stage_push_requested=0`
  - `update_lead` — owner or Owais only
  - `request_next_stage(lead_id, request_notes)` — auto-calculates next stage from STAGE_ORDER, creates Approval Request with full snapshot, sets `stage_push_requested=1` + `approval_status=Pending`; blocks if pending already exists
  - `approve_stage(approval_id, admin_notes)` — OWAIS_USERS only; advances lead.status, sets `stage_push_requested=0`, `approval_status=Approved`
  - `reject_stage(approval_id, rejection_reason, admin_notes)` — OWAIS_USERS only; sets `stage_push_requested=0`, `approval_status=Rejected`, saves rejection_reason; lead stage unchanged
  - `mark_failed(lead_id, reason)` — any employee with write permission
  - `get_pending_approvals()` — OWAIS_USERS only; returns all Pending Approval Requests with enriched lead notes
  - `create_quotation` + `get_quotation` — PDF via `frappe.utils.pdf.get_pdf`
- Frontend: `src/pages/crm/`:
  - `types.ts` — CRMLead (with `stage_push_requested`, `assigned_to_name`, `pending_approval`), CRMApprovalRequest (full snapshot fields)
  - `useCRM.ts` — `useRequestNextStage` (renamed from `useRequestStageAdvance`), `usePendingApprovals(enabled)`
  - `PipelineBoard.tsx` — card badges: "⏳ Awaiting Approval" (`stage_push_requested=1`), "❌ Rejected" (`approval_status=Rejected`); Owais sees collapsible approval panel at bottom with per-approval cards (full lead data + approve/reject inline)
  - `NewLeadForm.tsx` — navigates to `/crm/:id` after creation
  - `LeadDetail.tsx` — green "Push to [next] →" button when idle; orange "Awaiting" banner when pending; red "Rejected + reason" banner with re-request option; `AdminApprovalPanel` shows only for Owais when `pending_approval` exists; Mark as Failed for all employees
- `Sidebar.tsx` — CRM entry non-admin, Briefcase icon, label "CRM"; red pending count badge for Owais via `usePendingApprovals(!!isOwais)`
- Commits: backend `effa6f2`, frontend `88fc7d9`

✅ **Expense Claims Module (2026-05-15)**
- Custom DocType: `Vera Expense Claim` (autoname `VEC-.YYYY.-.####`) — 22 fields: claim_title (auto-generated), employee (Link→Employee), employee_name (fetch_from), employee_email, claim_type (Petrol/Material), claim_date, amount, km_driven, vehicle_number, route_from, route_to, fuel_receipt, material_description, vendor_name, material_receipt, purpose, status (Pending/Approved/Rejected, default Pending), admin_notes, reviewed_by, reviewed_on, rejection_reason, submitted_on. Migrated ✅
- Backend: `hr_client/api/expenses.py` — 6 endpoints:
  - `get_my_claims` (any employee, own records ordered by claim_date desc)
  - `get_all_claims` (Owais only, all employees)
  - `submit_claim` (POST, any employee — auto-detects employee from session, generates `claim_title = "{emp_name} - {claim_type} - {Month Year}"`, never trusts frontend-sent employee ID)
  - `approve_claim` (POST, Owais only)
  - `reject_claim` (POST, Owais only, rejection_reason required)
  - `get_monthly_summary` (employee gets own; Owais gets all — petrol vs material breakdown + aggregates)
- Frontend: `src/pages/expenses/`:
  - `types.ts` — ExpenseClaim, MonthlySummary, ClaimType, ClaimStatus, MONTHS
  - `useExpenses.ts` — 6 React Query hooks
  - `MyClaimsDashboard.tsx` — 4 summary cards, month/year selector, expandable claim rows, Admin View button for Owais
  - `NewClaimForm.tsx` — step 1: choose type (⛽ Petrol / 📦 Material); step 2: type-specific fields
  - `AdminClaimsView.tsx` — pending approvals banner, monthly summary per-employee table, all claims with filters
- App.tsx: 3 new routes `/expenses`, `/expenses/new`, `/expenses/admin`
- Sidebar: Expenses entry enabled for all users (module: expense)
- Commits: backend `68b5fef`, frontend `d3847f6`

✅ **Dropdown Transparent Background Fix (2026-05-15)**
- **Root cause:** `tailwind.config.js` maps `bg-popover` → `hsl(var(--popover))`, but `index.css` defines `--popover: oklch(1 0 0)` — oklch format is invalid inside `hsl()`, so browser ignores it → transparent. `SelectTrigger` also had explicit `bg-transparent`.
- **Fix:** `select.tsx` — SelectTrigger and SelectContent popup now use `bg-white text-gray-900` (explicit, no CSS variable dependency). SelectItem uses `hover:bg-gray-100 focus:bg-gray-100` instead of `focus:bg-accent`. `index.css` — added `select, select option { background-color: white; color: #111827; }` to cover native select elements.
- Applied globally — affects all Select dropdowns across the app.

✅ **UI Overhaul — Design System (2026-05-15)**
- **Design tokens added** to `index.css`: `--brand-primary` (#4F46E5), `--bg-app` (#F8FAFC), `--bg-sidebar` (#0F172A), status colors, `--shadow-card`, `--shadow-card-hover`, `--radius-card` (12px), `--radius-button` (8px).
- **Sidebar:** 220px wide; indigo square logo mark + "Vera ERP" branding; nav items — muted default (#94A3B8), hover = #1E293B bg + indigo-300 icon, active = #4F46E5 bg + white text + indigo shadow; "soon" badge styled; user info section at bottom (avatar circle + name + email + sign out).
- **Dashboard:** 26px bold greeting + date on right; stat cards with border + shadow + hover lift + colored circle icon bg; activity items use lucide icons instead of dots, hover highlight, borders between rows; Quick Actions → solid filled buttons (indigo, violet, emerald).
- **My Profile:** Indigo→violet gradient banner (80px); avatar overlaps banner with white border; name/designation/department as indigo-50 pills; section cards have left indigo border accent; tab bar uses underline style with indigo active state.
- **Expenses:** Summary cards use spec status colors (Total: white/indigo, Approved: green-50, Pending: yellow-50, Rejected: red-50); claim rows hover shows indigo-300 border + shadow; Petrol/Material badges use blue-100/violet-100.
- **Layout:** Overall page background changed to `--bg-app` (#F8FAFC).
- Frontend commit: `f312134`

✅ **Employee Data Fill + Profile Display Fixes (2026-05-15)**
- All 5 employee records seeded via `hr_client.patches.fill_employee_data`: personal_email, cell_number, gender, employment_type, reports_to (where applicable). Maaz also got date_of_birth.
- Employment Type masters created: Full-time, Part-time, Contract, Probation (table was empty).
- **Employee phone numbers:** Owais: 9845320577, Maaz: 8904706343, Manjunath: 9606944904, Lookman: 9035076487, Bhagya Shree: 9845322006.
- `gender` added to `SELF_EDITABLE` in `employee.py` (employees can now edit their own gender).
- Frontend profile page fixes:
  - `formatDateDisplay`: shows "1 January 1995" instead of raw "1995-01-01" (date_of_birth and locked date_of_joining fields)
  - `formatPhone`: formats 10-digit Indian numbers as "+91 XXXXX XXXXX" (cell_number, emergency_phone_number)
  - Gender field now renders as a select dropdown (Male/Female/Non-binary/Prefer not to say) when in edit mode
- Backend commit: `94c54a9`, Frontend commit: `c8ee907`

✅ **My Profile — Full-Width Redesign (2026-05-15)**
- **Layout:** Full-width, no max-width constraint. Two-column grid on desktop (`lg:grid-cols-5`): left 2/5 (Personal Info + Documents), right 3/5 (Work Info + Bank Details). Skills full-width at bottom. Single column on tablet/mobile.
- **Header:** 160px indigo→violet gradient banner; 100px avatar circle overlapping banner by ~50px (white 4px border); name (24px bold), designation/department pills, active badge, work email below.
- **Edit mode:** Editable fields get `#EEF2FF` bg + `#C7D2FE` border; locked fields show lock icon. Edit/Save/Cancel buttons in top-right of header card. No page navigation — all inline.
- **Skills section:** Interactive chips with X to remove; inline add input + Add button; Enter key adds skill. Shows "Add your skills" prompt when empty and editable.
- **Documents:** Employees can now edit their own Aadhaar/PAN (moved from ADMIN_ONLY → SELF_EDITABLE). Read mode shows "Stored securely" with lock icon when filled; edit mode shows blank input. Backend masking removed (non-admins can only access their own profile anyway).
- **Field formatting:** Dates as "1 January 1990"; phones as "+91 XXXXX XXXXX"; "Not set" italic for empties.
- **Tab bar:** Sticky at top of page content area; underline active indicator (indigo).
- Backend commit: `d8845f7`, Frontend commit: `ea9e43b`

✅ **Recruitment — Job Card Listing Page + Admin Controls (2026-05-15)**
- Dummy job opening HR-OPN-2026-0001 ("Senior Python Developer") and its rejected applicant deleted via `cleanup_dummy_jobs` patch.
- Backend: `close_job_opening(job_id)` — sets status=Closed (Owais-only). `delete_job_opening(job_id)` — cascades to applicants → interviews → offers then deletes opening (Owais-only). `num_positions` param added to `create_job_opening`.
- Frontend: `RecruitmentPage` rewritten as job card listing at `/recruitment` — cards show title, designation, department, posted date, candidate count badge. Owais-only: "+ Post New Job" inline modal, close button (X, amber), delete button (trash, red) with inline confirm. Closed jobs collapsible section.
- `PipelinePage.tsx` at `/recruitment/pipeline/:jobOpening` — kanban view with breadcrumb "← Jobs" link and "Add Candidate" button.
- `useCloseJobOpening` + `useDeleteJobOpening` hooks added to `useRecruitment.ts`.
- Build passes clean ✅. Backend commit: `de93d8f`. Frontend commit: `2525f42`.

## In progress
Nothing — all features built and wired to real backend. `VITE_USE_MOCK=false`.

✅ **Employee Profile Fix + Admin Employee Detail Page (2026-05-15)**
- **Root cause of blank profile for Administrator:** `_get_employee_by_email("Administrator")` found nothing because Employee records store `user_id = "owais@veraenterprises.in"`. Fixed by adding `_ADMIN_EMAIL_MAP = {"Administrator": "owais@veraenterprises.in"}` — all email lookups resolve through this map first.
- **Lookup order improved:** Now tries `user_id` first (most reliable), then `company_email`, then `personal_email`.
- **`get_all_employees` now returns `pending_leaves`:** Counts `Vera Leave Application` records with `status=Pending` per employee. Shows as amber badge on employee cards.
- **New page: `/admin/employees/:email` → `AdminEmployeeDetailPage.tsx`** — 4 tabs:
  - Profile: Full admin edit (all fields, photo upload), uses `adminUpdateProfile`
  - Leave History: All leaves with inline Approve/Reject (reject modal with required admin_remarks)
  - Attendance: Placeholder — "Jibble per-employee history coming soon"
  - Permissions: Module toggle grid for this employee, uses existing `useUsersWithPermissions` + `useUpdatePermissions` hooks; shows lock message for admins
- **`AdminEmployeesPage.tsx` updated:** Cards navigate to `/admin/employees/:email` (was `/employee/profile/:id`); pending leave count shown as amber badge top-right of avatar.
- **`EmployeeProfilePage.tsx` tabs added (self-view `/my-profile`):** Profile tab (existing content), Leave History tab (read-only table via `useMyLeaves`), Attendance tab (placeholder). Admin view via `/employee/profile/:id` remains tab-free as before.
- **`App.tsx`:** Added `<Route path="/admin/employees/:email" element={<AdminEmployeeDetailPage />} />`
- Build passes clean ✅

✅ **Leave Request & Approval System (2026-05-15)**
- Custom DocType: `Vera Leave Application` — 12 fields, autoname `VLA-.YYYY.-.####`, migrated ✅
  - employee (Link→Employee), employee_name (fetch_from), leave_type (8 options Select), from_date, to_date, total_days (auto calc), reason, status (Pending/Approved/Rejected), admin_remarks, applied_on, approved_by, approved_on
- Backend: `hr_client/api/leave.py` — 7 endpoints:
  - `apply_leave` (POST, any employee), `get_my_leaves` (GET, any employee)
  - `get_all_leaves` (GET, admin, filter by status/email), `get_employee_leave_history` (GET, admin)
  - `approve_leave` (POST, admin), `reject_leave` (POST, admin, admin_remarks required)
  - `get_leave_summary` (GET, admin, year aggregate)
- Total days calc: excludes Sundays. Employee auto-detected from `frappe.session.user` via `Employee.user_id`.
- Frontend employee: `/leave` → `LeavePage.tsx` — Apply form + My History table + Balance sidebar card
- Frontend admin: Under `/admin/attendance` (new top-level tab: "Attendance" | "Leave Requests")
  - `LeaveAdminPanel.tsx` — 4 sub-tabs: Pending | All Requests | By Employee | Summary Report
  - Pending: card per request with Approve (confirm dialog) / Reject (modal with admin_remarks) buttons
  - By Employee: grid cards + full history modal
  - Summary: table with per-employee day counts + CSV export
- Sidebar: "Leave" nav item added for all non-admin users (after My Profile), module: "attendance"
- `useLeave.ts`: 6 React Query hooks (useMyLeaves, useApplyLeave, useAllLeaves, useEmployeeLeaveHistory, useLeaveSummary, useApproveLeave, useRejectLeave)
- Build passes clean ✅

✅ **Permission Dashboard Bug Fix (2026-05-14)**
- **Root cause of toggle double-fire:** Switch's internal `onClick` bubbled to parent tile `<div onClick>`, calling `toggle()` twice → state returned to original. Fixed by adding `e.stopPropagation()` to `switch.tsx` onClick.
- **`get_my_permissions` added:** No-admin-check endpoint returns calling user's module permissions from `User Module Permission` DocType. Admins always get all-true.
- **ERPNext role sync:** `update_user_permissions` now calls `_sync_user_roles()` after saving the DocType — computes union of roles for all enabled modules and updates the ERPNext User doc's roles table accordingly.
- **PermissionsContext:** `src/context/PermissionsContext.tsx` — fetches `get_my_permissions` on login (non-admins only, 5min stale), provides `moduleEnabled(module)` helper. Optimistic-true while loading.
- **Permission-aware Sidebar:** `Sidebar.tsx` uses `usePermissions()` to hide nav items whose module is disabled. Recruitment hides when `recruitment=false`, Employees hides when `employee_lifecycle=false`, etc.
- **App.tsx:** `<PermissionsProvider>` wraps all routes inside `<AuthProvider>`.

AI JD Generator remains ON HOLD — AI provider undecided. See "ON HOLD" section below.

✅ **Accounts Module — Folder View + Real Uploader Detection (2026-06-02)**
- **NEW: Folder View tab** (`FolderViewTab.tsx`) — third tab between Drive Documents and Upload Status:
  - Stats header with color-coded pills per top-level folder (Sales/Purchase/Accounts/HR/Logistics) + file counts
  - Collapsible folder tree with chevrons, folder color coding, file type icons (PDF=red, Excel=green, Word=blue)
  - Real-time search (flat list with folder path shown, result count)
  - Right panel on file click: filename, size/type meta, uploader section (name + email + detection label), last modified by, Open in Drive, Analyse File
  - Refresh button: syncs drive + invalidates tree query
  - Loading skeletons, error state with retry

✅ **Accounts Module — Google Drive Dashboard in React SPA (2026-06-02)**
- Route `/accounts` → `src/pages/Accounts/index.tsx` — three sub-tabs: Drive Documents + Folder View + Upload Status
- `src/api/accounts.ts` — 8 typed fetch functions (getDriveStats, syncDrive, getDriveFiles, markReviewed, flagFile, analyseFile, getFolderTree, getFolderContents)
- **Drive Documents tab** (`DriveDocumentsTab.tsx`):
  - Stat cards: Total/Pending/Flagged/Last Sync with accent colors
  - Category pills: All/Sales/Purchase/Accounts/HR/Logistics
  - File table: 8 columns — added "Uploaded By" column with detection badge (●green=drive_api, ●blue=last_modifier, ~grey=folder_path, ⚠orange=drive_api_unknown, ⚠red=unknown)
  - Per-row actions: View (opens Drive + triggers analyse_file), ✓ Reviewed (POST mark_reviewed), ⚑ Flag (modal with required notes → POST flag_file)
  - Analysis panel below table: spreadsheet → striped HTML table, PDF → scrollable pre, 3 Claude AI prompt buttons
  - Stats auto-refresh every 5 minutes via `refetchInterval`
  - Loading skeletons, empty state, error state
- **Upload Status tab** (`UploadStatusTab.tsx`):
  - 2×2 grid of employee cards (Maaz/Lookman/Manjunath/Bhagya) with `expectedEmail` field
  - Per doc-type: shows individual files with filename, date, uploader line (detection dot + name + method label)
  - ⚠ Warning shown when file was uploaded by someone other than the expected employee for that folder
- Sidebar: "Accounts" item added after Attendance, icon: BookOpen, `module: "accounts"` (permission-gated for non-admins, always visible for admin)
- TypeScript: zero errors

**VE Drive File DocType fields (full list):**
`file_name, original_name, doc_type, category, party_name, file_date, drive_file_id, drive_view_link, drive_folder_path, file_extension, status, admin_notes, synced_on, uploaded_by_name, uploaded_by_email, last_modified_by_name, last_modified_by_email, upload_detected_method`

**Uploader detection priority order (stored as `upload_detected_method`):**
1. `drive_api` — Drive API `owners[0]` matched to a Vera employee (most accurate)
2. `drive_api_unknown` — Drive API `owners[0]` is NOT a Vera employee (stored as-is)
3. `last_modifier` — `lastModifyingUser` matched to a Vera employee
4. `folder_path` — fallback: employee inferred from which folder the file is in

**VERA_EMPLOYEES map (in google_drive.py):**
- `maazdgr8.mma@gmail.com` → Maaz (Sales)
- `lookman.vera@outlook.com` → Lookman (Purchase + Logistics)
- `manju.veraaccnts@outlook.com` → Manjunath M N (Accounts)
- `bhagyashree.veraenterprises@outlook.com` → Bhagya Shree (HR)
- `owais@veraenterprises.in` → Owais Ahmed Khan

**Guardrails:**
- Never silently assume ownership — always store and show `upload_detected_method`
- Always backfill existing records after adding new detection fields (use `IS NULL OR = ''` filter, not just `= ''`)
- Drive API fields string must be a single compact line — multiline/indented strings cause HTTP 400

✅ **Sidebar Navigation Redesign (2026-06-02)**
- Complete rewrite of `src/components/layout/Sidebar.tsx`
- **Structure:** Logo → Top profile (clickable → /my-profile) → Dashboard → My Profile → HR group → Recruitment → Accounts group → CRM [soon] → Performance [soon] → Permissions [admin] → Bottom profile + Sign out
- **HR group** (dropdown, default expanded): Attendance (/admin/attendance) + Holidays sub-item (/admin/attendance?tab=holidays) + Leave + Expenses + Team [admin only]
- **Accounts group** (dropdown, default expanded): Drive Documents (/accounts) + Upload Status (/accounts?tab=upload)
- Dropdown state persisted in localStorage (`sidebar_hr_open`, `sidebar_accounts_open`)
- Active route auto-expands parent group on load/navigation via `useEffect`
- Manual active-state detection for search-param-dependent items (Drive Documents vs Upload Status)
- Mobile: fixed overlay with `translate-x` slide-in/out; desktop: inline with width collapse (existing pattern)
- `Layout.tsx`: mobile backdrop overlay added — tap outside closes sidebar on mobile
- `AccountsPage/index.tsx`: reads `?tab=upload` (upload-status) and `?tab=folder` (folder-view) from URL via `useSearchParams`; tab changes update URL with `replace: true`
- CRM and Performance shown as greyed-out disabled items with [soon] badge
- Top profile pill: avatar initials + name + email, clickable → /my-profile
- Permission-aware: HR items hidden per module permission; Recruitment/Accounts hidden if module disabled; Team/Permissions admin-only
- TypeScript: zero errors

**Sidebar guardrails:**
- Active route MUST always auto-expand its parent dropdown on page load (via useEffect on location.pathname)
- Dropdown state is always saved to localStorage — never reset to default after user collapses
- Use manual isActive checks (not NavLink isActive) for any items where search params affect which item is active
- CRM and Performance MUST remain disabled/greyed (use DisabledItem component) until explicitly re-enabled

✅ **My Profile Page — Tabbed Navigation with Persistent Header (2026-06-02)**
- Complete rewrite of `src/pages/profile/EmployeeProfilePage.tsx` (~500 lines replacing 796-line original)
- **Always-visible ProfileHeader:** 120px gradient banner + 80px avatar (overlapping 40px) + name, designation/dept, email, phone, status badge + Edit/Save/Cancel buttons in top-right. Header never scrolls away and is visible regardless of active tab.
- **3 tabs (self-view only — `showTabs = isSelf`):**
  - Profile: full two-column edit form (all sections from old page)
  - Attendance: placeholder ("coming soon")
  - Leave History: 4 summary cards (Days Approved/Approved Count/Pending/Rejected) + filter pills + Apply button + leave table + ApplyLeaveModal
- **Tab state:** persisted in `localStorage` via key `"profile_tab"`. `switchTab()` saves before state update.
- **Edit mode:** `handleEditClick()` always switches to Profile tab first, then sets `editMode=true`. Switching tabs while in edit mode is allowed (draft kept); Save/Cancel remain in header.
- **ApplyLeaveModal:** 8 leave types (LEAVE_TYPES), from/to date pickers, auto-calc total days excluding Sundays, reason textarea, submits via `useApplyLeave` mutation + invalidates queries.
- **Admin view** (`isSelf=false`): no tab bar rendered — shows Profile content only; Edit button still works (calls `adminUpdateProfile`).
- **TypeScript:** zero errors (verified with `npx tsc --noEmit`).

**Decision logged:** Profile page uses persistent header + tab navigation instead of sidebar sections. Header always visible above tabs.

✅ **Holidays & Leave Policy Feature (2026-06-02)**
- **ERPNext:** "Vera Enterprises 2026" Holiday List created via `hr_client.patches.create_holidays_2026.execute` — 14 public holidays inserted into ERPNext Holiday List DocType.
- **Backend:** Added 2 endpoints to `hr_client/api/leave.py`:
  - `get_holidays()` — returns all 14 holidays with computed `is_past`, `is_today`, `is_upcoming`, `days_until` fields. No auth restriction (public calendar data).
  - `get_leave_policy()` — returns full policy: summary (14 public holidays + 1 happy holiday + 12 EL + 5 SL + 5 carry forward), 8 leave type cards with rules, and 6 important rules. No auth restriction.
- **Frontend:** `src/pages/holidays/HolidaysPage.tsx` — standalone `/holidays` route:
  - 3 inner tabs: **2026 Holidays** | **Leave Policy** | **Important Rules**
  - Calendar tab: 4 summary stat cards + "next holiday" banner (always shows days until) + leave balance bar chart (computed from useMyLeaves) + holidays grouped by month with past/today/upcoming/next badges + Happy Holiday card
  - Policy tab: summary pills + 8 expandable accordion cards with color-coded borders per leave type
  - Rules tab: yellow warning card with 📌 rule bullets
  - `HolidaysContent` exported separately for reuse inside the Profile tab
- **Sidebar:** Holidays sub-item now links to `/holidays` (was `/admin/attendance?tab=holidays`). `isHolidaysActive` = `path === "/holidays"`. `isAttendanceActive` simplified (no longer needs search-param exclusion). Auto-expand useEffect updated to include `/holidays`.
- **My Profile:** Added 4th tab "Holidays" (icon: BarChart3) to self-view tab bar. Renders `<HolidaysContent />` inside a padded wrapper.
- **Types:** `Holiday`, `LeaveTypePolicy`, `LeavePolicy` interfaces added to `src/pages/leave/types.ts`
- **Hooks:** `useHolidays()` and `useLeavePolicy()` added to `src/pages/leave/useLeave.ts` (1hr stale time — static data)
- **App.tsx:** `/holidays` route added inside protected Layout
- TypeScript: zero errors

**Decision:** Holiday data hardcoded in `get_holidays` endpoint AND stored in ERPNext Holiday List — dual storage for reliability. ERPNext list used by HRMS core; API endpoint used by React frontend.

**Holiday List in ERPNext:** "Vera Enterprises 2026" — 14 holidays, 2026-01-01 to 2026-12-25.

## What's next
- Forms Integration backend (B1–B5) + frontend (F1–F6)
- Employee Lifecycle custom fields (B-EL1: custom_onboarding_stage, documents_checklist, it_setup_checklist on Employee DocType)
- Resume AI JD Generator once AI provider is decided
- Jibble data shown in profile page Leave & Attendance section (wire get_attendance_today per employee)
- Add "accounts" to Permission Dashboard toggle list so non-admin visibility can be controlled
- Holidays tab on Attendance page (/admin/attendance?tab=holidays) — route exists but tab not yet built

## ON HOLD — AI Job Description Generator
**Status:** UI fully built and working. Blocked on AI provider.

**Problem:** All free-tier AI APIs exhausted or uncredentialed:
- Gemini `gemini-2.0-flash` / `gemini-2.0-flash-lite` → 429 free tier quota = 0
- OpenAI `gpt-4o-mini` → 429 insufficient_quota (no billing on account)
- Groq → not yet set up

**To resume, pick one:**
1. **Groq (free)** — sign up at console.groq.com, get API key, add `VITE_GROQ_API_KEY=gsk_...` to `.env`. Code change: 3 lines (URL + model + key name). Model: `llama-3.3-70b-versatile`.
2. **OpenAI (paid)** — add $5 credits at platform.openai.com/settings/billing. No code change needed, just restore `VITE_OPENAI_API_KEY`.
3. **No AI (Option A)** — make Generate button skip AI and open blank review panel; HR fills sections manually + downloads PDF. Full PDF feature retained.
4. **No AI (Option B)** — revert to original `CreateJobOpeningModal` (simple form, no PDF). One-line swap in `RecruitmentPage.tsx`.

**Current code state:** `AIJobDescriptionGenerator.tsx` calls `callOpenAI()` targeting `gpt-4o-mini`. Switching to Groq = change URL to `https://api.groq.com/openai/v1/chat/completions`, model to `llama-3.3-70b-versatile`, key to `import.meta.env.VITE_GROQ_API_KEY`.

✅ **Vera Drive — Google Drive Integration App (2026-06-01)**
- New Frappe app `vera_drive` created, installed on `hrms.localhost`
- Google Drive service account: `vera-drive-bot@vera-drive-498117.iam.gserviceaccount.com`
- Root Drive folder ID: `1tuZUNAScIAR7IX3sttH6VgKkQNsy5IDu` (Vera Enterprises — Documents)
- Service account JSON: `apps/vera_drive/vera_drive/service_account.json` — NEVER commit or move
- 2 DocTypes: `VE Drive File`, `VE Drive Sync Log` (triple-nested path: `vera_drive/vera_drive/vera_drive/doctype/`)
- 34 files synced from Drive on first run; sync runs every 30 min via cron scheduler
- Dashboard at `/app/vera-dashboard` in ERPNext desk
- Python deps pinned to Frappe-compatible versions (google-api-python-client~=2.188.0, etc.)
- API endpoints in `vera_drive/api.py`: `sync_now`, `get_dashboard_stats`, `get_all_files`, `mark_reviewed`, `flag_file`, `analyse_file`
- Dashboard features: metric cards, category filter pills, file table with View/Reviewed/Flag actions, analysis panel (PDF/spreadsheet preview), employee upload status cards
- Note: bench must run on port 8001 (Windows Hyper-V reserves 8000 on WSL2) — Procfile updated

## API Contract

### Vera Drive Endpoints (LIVE — 2026-06-01)
Base: `/api/method/vera_drive.api.<endpoint>`
Auth: session cookie. All require Administrator or System Manager role.

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `sync_now` | Triggers immediate Drive sync, returns `{status: 'ok'}` |
| GET | `get_dashboard_stats` | Returns total/pending/flagged counts + last_sync for current month |
| GET | `get_all_files` | Params: `category` (All/Sales/Purchase/Accounts/HR/Logistics), `status` (optional). Returns all DriveFile fields including uploader fields |
| POST | `mark_reviewed` | Param: `docname`. Sets status=Reviewed |
| POST | `flag_file` | Params: `docname`, `notes`. Sets status=Flagged |
| POST | `analyse_file` | Params: `drive_file_id`, `file_extension`. Returns spreadsheet rows or PDF text |
| GET | `get_folder_tree` | Full recursive tree from ROOT_FOLDER_ID. Each file includes uploader info from Drive API owners/lastModifyingUser |
| GET | `get_folder_contents` | Param: `folder_id`. Returns `{folders, files}` for a single folder (lazy load) |

---

## API Contract

### Jibble Endpoints (LIVE — 2026-05-15)
Base: `/api/method/hr_client.api.jibble.<endpoint>`
Auth: session cookie. ALL endpoints require `owais@veraenterprises.in` or `Administrator`.
Credentials: `jibble_client_id` and `jibble_client_secret` in site config (bench set-config).
Token: Bearer token fetched from `https://identity.prod.jibble.io/connect/token`, cached 3500s.
Jibble API base: `https://time-tracking.prod.jibble.io`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `get_people` | All team members + status |
| GET | `get_whos_in` | Currently clocked-in (status eq ClockedIn) |
| GET | `get_attendance_today` | Today's timesheets with computed status (on_time/late/working/absent) |
| GET | `get_weekly_summary` | Per-person hours Mon–today |
| GET | `get_monthly_summary` | Per-person hours + avg + overtime days this month |
| GET | `get_tracked_time_report` | Raw `/v1/TrackedTimeReport` |
| GET | `get_activities` | Raw `/v1/Activities` |
| GET | `get_projects` | Raw `/v1/Projects` |
| GET | `get_late_today` | Clock-in after 09:30 IST — computed from today's timesheets |
| GET | `get_absent_today` | People with no timesheet entry today |
| GET | `get_overtime` | Days with >9h worked this month, per person |
| GET | `test_connection` | Force-refresh token + ping People endpoint — returns connected bool |

**Key gotcha:** Correct endpoint is `/v1/TimeEntries` — `/v1/Timesheets`, `/v1/TimesheetEntries`, `/v1/TrackedTimeReport` all return 404 for this org.
**Key gotcha:** `belongsToDate` is OData `Edm.Date` — filter MUST omit quotes: `belongsToDate eq 2026-05-14` (NOT `'2026-05-14'`). Quoted dates return HTTP 400.
**Key gotcha:** `localTime` from Jibble has 4-digit fractional seconds — normalise to 6 digits before Python `fromisoformat` (regex in `_parse_iso`).
**Key gotcha:** Unfiltered `/v1/TimeEntries` returns 0 results — always filter by `belongsToDate`.
**Key gotcha:** `/v1/People` uses `fullName` not `name`. `/v1/WhoIsWorkingNow` is the live clock-in feed.
**Key gotcha:** Late threshold = 09:30 IST. `localTime` is already in +05:30 offset — use as-is.
**Key gotcha:** `get_absent_today` / `get_absent_by_date` fetches People + TimeEntries — 2 API calls (People is cached 5min).
**Key gotcha:** Per-day cache `jibble_ts_{date}`: 5min TTL today, 1hr for past. `bust_cache` deletes these keys + people cache.

### Recruitment Endpoints (LIVE — tested 2026-04-20)
Base: `/api/method/hr_client.api.recruitment.<endpoint>`
Auth: session cookie, HR Manager or System Manager role required on all.

| Method | Endpoint | Params | Notes |
|---|---|---|---|
| GET | `get_job_openings` | `status` (opt, default "Open") | Returns list + per-stage counts |
| GET | `get_pipeline` | `job_opening` (req) | Returns all 6 stages with candidates |
| GET | `get_candidate` | `name` (req) | Full detail + interviews + offer |
| POST | `create_job_opening` | `job_title`, `designation`, `department`, `description`, `interview_rounds` (JSON arr) | |
| POST | `add_candidate` | `job_opening`, `applicant_name`, `email_id`, `phone_number`, `source`, `cover_letter`, `resume_link` | `source` must match Job Applicant Source record |
| POST | `move_candidate` | `applicant`, `stage` | Blocks `Hired` and `Offer Sent` (system-only) |
| POST | `reject_candidate` | `applicant`, `rejection_reason` | Sets HRMS status=Rejected too |
| POST | `schedule_interview` | `job_applicant`, `interview_round`, `scheduled_on`, `from_time`, `to_time` | Auto-moves candidate to Interview stage |
| POST | `send_offer` | `job_applicant`, `offer_date`, `designation`, `company` | Auto-moves candidate to Offer Sent |
| POST | `update_offer_status` | `offer`, `status` (Accepted/Rejected) | Creates Employee on Accept |
| POST | `update_candidate_notes` | `applicant`, `notes` | Internal HR notes only |
| GET | `get_interview_rounds` | — | All Interview Round masters |
| GET | `get_applicant_sources` | — | All Job Applicant Source records |

**Key gotcha:** `source` field on Job Applicant is a Link → `Job Applicant Source` (master data). Pass name of existing record or omit.
**Key gotcha:** DocType files must go in `hr_client/hr_client/hr_client/doctype/`, not `hr_client/hr_client/doctype/`.

### Permissions Endpoints v2 (LIVE — updated 2026-05-14)
Base: `/api/method/hr_client.api.permissions.<endpoint>`
Auth: session cookie. Write endpoints require Administrator or owais@veraenterprises.in.
Storage: `User Module Permission` DocType (one record per user, auto-created on first save).

| Method | Endpoint | Params | Notes |
|---|---|---|---|
| GET | `get_all_users_with_permissions` | — | All 5 Vera team members, all permissions default true |
| POST | `update_user_permissions` | `email` (req), `permissions` (req, JSON string) | Admin-only; `{"recruitment": true, "accounts": false, ...}` |
| GET | `get_users_with_roles` | — | Legacy v1 — delegates to `get_all_users_with_permissions` |
| POST | `update_user_roles` | `user_email`, `modules` (old key format) | Legacy v1 — converts keys and delegates to `update_user_permissions` |

**8 Permission modules (snake_case):** `recruitment`, `employee_lifecycle`, `accounts`, `projects`, `logistics`, `hr`, `attendance`, `expense`

**All 4 non-admin users have these ERPNext roles assigned:** HR Manager, HR User, Accounts Manager, Accounts User, Projects User, Stock Manager, Stock User, Expense Approver, Employee, Leave Approver

**Key gotcha:** `permissions` param must be a JSON string — Frappe param parser cannot reliably deserialize nested dicts from POST body unless `Content-Type: application/json` is set. Always `JSON.stringify()` on frontend side.

### Employee Profile Endpoints (LIVE — 2026-05-14)
Base: `/api/method/hr_client.api.employee.<endpoint>`
Auth: session cookie. Non-admins can only read/write their own profile.

| Method | Endpoint | Params | Notes |
|---|---|---|---|
| GET | `get_employee_profile` | `email` (opt, defaults to session user) | Returns full profile. Non-admins get masked Aadhaar/PAN. |
| POST | `update_own_profile` | `fields_to_update` (JSON string) | Self-edit only. Allowed: image, personal_email, cell_number, person_to_be_contacted, emergency_phone_number, current_address, blood_group, bank_name, bank_ac_no, custom_ifsc_code, custom_skills |
| POST | `admin_update_profile` | `email` (req), `fields_to_update` (JSON string) | Admin-only. Can also update: designation, department, date_of_joining, employment_type, reports_to, company_email, status, first_name, last_name, custom_aadhaar_number, custom_pan_number |
| POST | `upload_profile_photo` | multipart `file` + optional `email` | Saves to ERPNext file manager, updates Employee.image |
| GET | `get_all_employees` | — | Admin-only. Returns all 5 active employees with key fields. |

**Key gotcha:** Emergency Contact Name field in ERPNext is `person_to_be_contacted`, NOT `emergency_contact_name`.
**Key gotcha:** `custom_aadhaar_number` and `custom_pan_number` are masked ("••••") for non-admin users in `get_employee_profile`.
**Key gotcha:** `fields_to_update` must be JSON.stringify'd on the frontend — Frappe param parser requires it.

**Designations in system (ONLY these 8 — all defaults deleted):**
Manager | Project Manager | Accounts Manager | Accounts Executive | GST & TDS Specialist | Logistics Manager | Stock Monitor | Porter Executive

### AI Job Description Generator Endpoints (PLANNED — not yet built)
See BACKEND-SPRINT-1.md for full implementation spec.
Requires: `pip install anthropic` in bench env; `bench set-config anthropic_api_key "..."` on site.
Requires: Custom Field `Job Opening-custom_job_description_md` (Long Text) on Job Opening.

| Method | Endpoint | Params | Notes |
|---|---|---|---|
| POST | `generate_job_description` | `rough_description` (req), `job_title` (req), `department` (opt) | Calls Claude API, returns markdown JD. Does NOT save — frontend previews first. |
| POST | `save_job_description` | `job_opening` (req), `job_description_md` (req) | Saves approved markdown to `custom_job_description_md` field on Job Opening. |
| GET | `export_jd_pdf` | `job_opening` (req) | Converts stored markdown to PDF, saves to `/files/`, returns `pdf_url`. |

**`generate_job_description` response:**
```json
{
  "message": {
    "success": true,
    "job_description_md": "## Senior Backend Engineer\n\n### About the Company\n..."
  }
}
```

**`save_job_description` response:**
```json
{ "message": { "success": true } }
```

**`export_jd_pdf` response:**
```json
{ "message": { "success": true, "pdf_url": "/files/jd_HR-OPN-2024-0001.pdf" } }
```

### Employee Lifecycle Endpoints (PLANNED — not yet built)
See EMPLOYEE-LIFECYCLE-PLAN.md for full implementation spec.
New file: `hr_client/hr_client/api/employee_lifecycle.py`
Requires: 4 Custom Fields on Employee + new `Employee Exit` DocType + `employee_welcome` Email Template fixture.

| Method | Endpoint | Params | Notes |
|---|---|---|---|
| GET | `get_employees` | `status` (opt), `onboarding_stage` (opt), `page` (opt), `page_length` (opt) | Employee list with stage badges |
| GET | `get_employee_detail` | `employee_id` (req) | Full profile + parsed checklists + exit summary |
| POST | `create_employee` | `first_name`, `last_name`, `date_of_joining`, `designation`, `department`, `company`, `personal_email`, `cell_number`, `job_applicant` (opt) | Sets Offer Accepted stage automatically |
| POST | `update_onboarding_stage` | `employee_id` (req), `stage` (req), `checklist_data` (opt JSON) | Validates mandatory docs; triggers welcome email on First Day |
| GET | `get_onboarding_checklist` | `employee_id` (req) | Both checklists + mandatory_docs_complete flag |
| POST | `submit_resignation` | `employee_id` (req), `resignation_date` (req), `last_working_day` (opt), `resignation_letter_url` (opt) | Creates Employee Exit record |
| POST | `submit_exit_interview` | `employee_id` (req), `exit_reason`, `would_recommend`, `enjoyed_most`, `improvement_suggestions`, `management_feedback` | Sets exit status=Interview Done; Employee status=Left |
| GET | `get_exit_details` | `employee_id` (req) | Employee Exit record or null |
| POST | `send_welcome_email` | `employee_id` (req) | Sends via Email Template `employee_welcome` |

**Key gotchas:**
- `custom_documents_checklist` and `custom_it_setup_checklist` stored as JSON strings — always `json.loads()` before reading.
- Employee `status = "Left"` set only when `last_working_day ≤ today`, not on resignation submission.
- Resignation letter file uploaded separately via `/api/method/upload_file` — endpoint receives the returned `file_url`.
- Welcome email uses `frappe.render_template()` on both `subject` AND `response` — omitting it on subject leaves Jinja vars literal.

**New DocType:** `Employee Exit` — fields: employee, resignation_date, last_working_day, resignation_letter (Attach), exit_reason (Select), would_recommend (Select), enjoyed_most/improvement_suggestions/management_feedback (Long Text), status (Pending/Interview Done/Cleared/Settled), final_settlement_status (Pending/Done).

### Forms Integration Endpoints (PLANNED — not yet built)
See "## Current Sprint → Forms Integration" above for spec.

### Field Schema Format (used inside `fields_schema` JSON column)
```json
[
  {
    "fieldname": "employee_name",
    "label": "Employee Name",
    "fieldtype": "Data",
    "required": true
  },
  {
    "fieldname": "department",
    "label": "Department",
    "fieldtype": "Select",
    "options": ["HR", "IT", "Finance"],
    "required": false
  },
  {
    "fieldname": "start_date",
    "label": "Start Date",
    "fieldtype": "Date",
    "required": true
  },
  {
    "fieldname": "is_confirmed",
    "label": "Confirmed",
    "fieldtype": "Check",
    "required": false
  }
]
```
Supported fieldtypes: `Data`, `Select`, `Check`, `Date`, `Int`, `Text`.

---

### POST `/api/method/hr_client.api.forms.submit_form`
**Auth:** Guest (allow_guest=True — called by MS Forms via Power Automate)
**Body (JSON):**
```json
{
  "form_id": "FORM-TEMPLATE-NAME",
  "data": { "employee_name": "John", "department": "HR" },
  "submitted_by": "john@company.com"
}
```
**Response 200:**
```json
{ "message": { "success": true, "submission_id": "FORM-SUB-0001" } }
```
**Response 404:**
```json
{ "message": { "error": "Form template not found" } }
```

---

### GET `/api/method/hr_client.api.forms.get_form_templates`
**Auth:** Session (logged-in user)
**Params:** none
**Response 200:**
```json
{
  "message": {
    "templates": [
      {
        "name": "FORM-TMPL-0001",
        "form_name": "Leave Application",
        "form_type": "Leave Application",
        "is_active": 1
      }
    ]
  }
}
```

---

### GET `/api/method/hr_client.api.forms.get_form_template`
**Auth:** Session
**Params:** `name=FORM-TMPL-0001`
**Response 200:**
```json
{
  "message": {
    "name": "FORM-TMPL-0001",
    "form_name": "Leave Application",
    "form_type": "Leave Application",
    "is_active": 1,
    "fields_schema": [ /* array of field defs as above */ ]
  }
}
```
**Response 404:**
```json
{ "message": { "error": "Form template not found" } }
```

---

### GET `/api/method/hr_client.api.forms.get_submissions`
**Auth:** Session
**Params (all optional):** `form_template=FORM-TMPL-0001`, `status=Pending`, `page=1`, `page_length=20`
**Response 200:**
```json
{
  "message": {
    "submissions": [
      {
        "name": "FORM-SUB-0001",
        "form_template": "FORM-TMPL-0001",
        "form_name": "Leave Application",
        "submitted_by": "john@company.com",
        "employee": "EMP-0001",
        "status": "Pending",
        "submitted_at": "2026-04-20 10:30:00"
      }
    ],
    "total": 42,
    "page": 1,
    "page_length": 20
  }
}
```

---

### GET `/api/method/hr_client.api.forms.get_submission`
**Auth:** Session
**Params:** `name=FORM-SUB-0001`
**Response 200:**
```json
{
  "message": {
    "name": "FORM-SUB-0001",
    "form_template": "FORM-TMPL-0001",
    "form_name": "Leave Application",
    "submitted_by": "john@company.com",
    "employee": "EMP-0001",
    "submission_data": { "employee_name": "John", "department": "HR" },
    "status": "Pending",
    "submitted_at": "2026-04-20 10:30:00",
    "processed_at": null,
    "error_log": null
  }
}
```
**Response 404:**
```json
{ "message": { "error": "Submission not found" } }
```

## Team (Vera Enterprises)
| Name | Email | Department | Designation | ERPNext Employee ID |
|---|---|---|---|---|
| Owais Ahmed Khan | owais@veraenterprises.in | Management | Manager | HR-EMP-00001 |
| Maaz | maazdgr8.mma@gmail.com | Project | Project Manager | HR-EMP-00002 |
| Manjunath M N | manju.veraaccnts@outlook.com | Accounts | Accounts Manager | HR-EMP-00003 |
| Lookman | lookman.vera@outlook.com | Accounts | Accounts Executive | HR-EMP-00004 |
| Bhagya Shree | Bhagyashree.veraenterprises@outlook.com | Logistics | Logistics Manager | HR-EMP-00005 |

All passwords: `Vera@2026`. Owais logs in as `Administrator`.

## ERPNext Data Reference
**Company name:** `Vera Enterprises` (abbreviation: V — ERPNext appends ` - V` to department names)

**Departments in DB:** Management - V, Project - V, Accounts - V, Logistics - V (+ others from default ERPNext seed data)

**Custom Designations created:**
- Manager, Project Manager (existed by default)
- Accounts Manager, Accounts Executive, GST & TDS Specialist, Logistics Manager, Stock Monitor, Porter Executive (created 2026-05-14)

**Employee records:** All 5 team members created as ERPNext Employee docs (HR-EMP-00001 through HR-EMP-00005), linked to their User accounts, status Active, date_of_joining 2024-01-01.

## Decisions made
- Using shadcn/ui for all form components
- Odoo-style left sidebar (dark gray-900), collapsible, "Vera ERP" branding
- No Frappe desk in production — pure React SPA only
- Extend HRMS via hr_client, never modify core
- TEAM_USERS list hardcoded in `permissions.py` — only these 5 users appear in the permission dashboard; Owais maps to the `Administrator` Frappe user
- Owais's permission card is display-only (all modules locked on) — he is Administrator and cannot be restricted
- ERPNext is shadow backend — users never see the desk, only the React wrapper
- All designation/department dropdowns must load from API — never hardcode or use free-text inputs for these
- Self-edit vs admin-edit split: employees control personal info + bank + skills; only admins can change designation, department, joining date, work email, reporting manager, Aadhaar, PAN
- Aadhaar/PAN numbers masked ("Stored securely") for non-admin users in the profile page
- Company: Vera Enterprises (ERPNext name), abbreviation V, departments suffixed ` - V`

## Decisions made (additions 2026-06-01)
- `vera_drive` is a separate Frappe app, not part of `hr_client` — keeps Drive integration isolated and independently deployable
- Service account JSON stored in `apps/vera_drive/vera_drive/service_account.json` — NEVER in site config, never in code, never committed to a public repo
- Drive sync runs every 30 minutes via Frappe cron scheduler — not a background job or webhook, to avoid dependency on external triggers
- Bench runs on port 8001 on this dev machine because Windows Hyper-V (WSL2) silently reserves port 8000; `EADDRINUSE` with nothing showing in `ss`/`netstat` is the WSL2 Hyper-V port reservation symptom
- Python deps for vera_drive pinned to Frappe-compatible versions (use `~=` not `==` to avoid downgrading frappe's own packages)

## Decisions made (additions 2026-05-14)
- ERPNext role sync uses union-of-modules approach: roles are the union of all enabled module role sets. Disabling all modules leaves only `Employee` base role. This avoids the "shared role" problem where HR Manager is needed by multiple modules.
- `User Module Permission` DocType remains the source of truth for React frontend visibility; ERPNext roles gate actual Frappe desk access (which employees never use anyway). Both are synced on every `update_user_permissions` call.
- `get_my_permissions` is optimistic: frontend shows all sidebar items while the query loads, then hides restricted ones. This prevents layout flash on fast connections.

## DO NOT DO
- DO NOT modify core frappe/erpnext/hrms files
- DO NOT create endpoints without @frappe.whitelist()
- DO NOT run migrate without cache clear after
- DO NOT store Jibble API key in code — use site_config
- DO NOT call API endpoints not listed in API Contract
- DO NOT modify `vera_drive/vera_drive/service_account.json` — these are production Google service account keys
- All vera_drive API calls from React must use the existing `api` axios instance (withCredentials: true + CSRF interceptor) — never introduce raw fetch as a second HTTP client
- DO NOT create ERPNext desk pages for Accounts/Drive — everything goes in the React SPA at /accounts
- DO NOT pin vera_drive Python deps to versions older than what frappe 15.x requires — always use `~=` compatible version specifier and match frappe's own installed versions
- DO NOT start bench on port 8000 on this WSL2 machine — Windows Hyper-V reserves it; always use port 8001 (already set in Procfile)
- DO NOT push directly to main branch
- DO NOT call `self.save()` inside a `validate()` hook — causes infinite recursion
- DO NOT use `frappe.get_doc()` when you only need one field — use `frappe.db.get_value()` instead
- DO NOT catch bare `Exception` and silently swallow it — always re-raise or log
- DO NOT return raw HTTP responses from whitelisted methods — return dict/list only
- DO NOT render the Team employee detail page without a left panel — the layout must always be two-column (left: ProfileHeaderCard + tabs, right: NotesColumn). Always verify data fetch is wired before rendering the layout.
- DO NOT use `frappe.db.sql()` raw queries when ORM methods exist — SQL bypasses permission checks
- DO NOT forget `super().validate()` in controller validate() — skips parent class validation
- DO NOT write fixtures that duplicate existing Custom Fields — check DB first
- DO NOT use `db_set()` to update fields that need hooks/notifications to fire — use `save()` instead
- DO NOT add `allow_guest=True` to endpoints that read or write sensitive HR data
- DO NOT use naming_series without adding the `naming_series` fieldtype field to the DocType
- DO NOT place DocType folders in `hr_client/hr_client/doctype/` — they MUST be in `hr_client/hr_client/hr_client/doctype/` (inside the module subfolder) or Frappe will silently skip them during migrate
- DO NOT put `mcpServers` config in `apps/hr_client/.claude/settings.json` — Claude Code only reads MCP config from the project root `~/frappe-bench/.claude/settings.json`
- DO NOT pass a `source` string to Job Applicant without first confirming it exists in `Job Applicant Source` master — it's a Link field, not free text
- DO NOT run `bench migrate` without first starting bench (`bench start`) — migrate requires Redis cache + queue to be running or it will abort with "Service redis_cache is not running"
- DO NOT create users via bench console while bench is stopped — user creation triggers background jobs that need Redis queue (port 11000); the creation may succeed but the console will show scary ConnectionError warnings. Always verify with `frappe.db.exists("User", email)` after
- DO NOT put admin-only routes behind only a nav guard — also `<Navigate to="/" replace />` inside the page component when `user.name` is not in the admin set, so direct URL access is also blocked
- DO NOT use `@radix-ui/react-switch` — it is not installed; use `src/components/ui/switch.tsx` (the custom CSS toggle) instead
- DO NOT use CamelCase module keys (e.g. `EmployeeLifecycle`) in v2 permissions API — all module keys are snake_case: `employee_lifecycle`, `logistics`, etc.
- DO NOT expect `frappe.db.exists("Role", role)` to find "Projects Manager" — that role does not exist in ERPNext v15. Use "Projects User" instead
- DO NOT use `frappe.db.exists("User Module Permission", email)` when the user is Administrator — Administrator's frappe name IS "Administrator", not their email; always resolve email→frappe_name via TEAM_USERS before DocType lookups
- DO NOT skip `frappe.db.commit()` after `doc.save()` in API methods called via bench execute — bench execute doesn't auto-commit the way a web request does
- DO NOT set `VITE_API_BASE` to `http://hrms.localhost:8000` — this makes the browser call ERPNext directly, which fails because `hrms.localhost` only resolves inside WSL2, not in the Windows browser. Always leave `VITE_API_BASE=` (empty) in dev so all API calls go through the Vite proxy at `localhost:5173`. Only set a real base URL in production behind nginx.
- DO NOT change `VITE_USE_MOCK` back to `true` — the app is now wired to real ERPNext. Mock mode is permanently off. `.env.local` is the override file; `.env` values are ignored when `.env.local` sets the same key
- DO NOT expect `employee_lifecycle.py` custom field endpoints to work until B-EL1 is run (`bench migrate` with the 4 custom fields on Employee). Until then, defaults are returned and the UI shows empty checklists — this is by design
- DO NOT call `frappe.db.table_exists()` with the model name — use the table name e.g. `"tabEmployee Exit"` not `"Employee Exit"`
- DO NOT call `navigate("/login")` immediately after `setUser(null)` in the same event tick — `PublicOnlyRoute` reads stale `isLoggedIn=true` and bounces the user back to `/`, causing an infinite redirect; use `window.location.replace("/login")` for logout redirects instead
- DO NOT use a free-text Input for designation or department fields in any recruitment form — always use a Select dropdown loaded from `get_designations` / `get_departments` API endpoints so only valid Vera roles appear
- DO NOT allow an employee to edit their own designation, department, employee ID, date of joining, work email, or reporting manager — these are locked fields only admins can change. SELF_EDITABLE set in `employee.py` is the authoritative list; the frontend also enforces this but the backend is the true gate
- DO NOT use `emergency_contact_name` as a field name on Employee — the actual ERPNext field is `person_to_be_contacted`
- DO NOT use `/v1/Timesheets`, `/v1/TimesheetEntries`, or `/v1/TrackedTimeReport` for timesheet data — the correct Jibble endpoint is `/v1/TimeEntries` with `belongsToDate` filter (confirmed working 2026-05-15)
- DO NOT put quotes around OData `Edm.Date` literals in Jibble filters — `belongsToDate eq 2026-05-14` is correct; `belongsToDate eq '2026-05-14'` causes HTTP 400
- DO NOT call `/v1/TimeEntries` without a `belongsToDate` filter — unfiltered queries return 0 results
- DO NOT use `p.get("name")` on Jibble People records — the field is `fullName`, not `name`
- DO NOT filter People by `?$filter=status eq 'ClockedIn'` for live status — use `/v1/WhoIsWorkingNow` instead
- DO NOT call `datetime.fromisoformat()` directly on Jibble timestamps — they have 4-digit fractional seconds that Python 3.10 rejects; always use `_parse_iso()` which normalises via regex first
- DO NOT hardcode Jibble credentials (`jibble_client_id`, `jibble_client_secret`) in any Python or JS file — read only via `frappe.conf.get(...)` in backend; never pass to frontend
- DO NOT call Jibble API without the cached bearer token — always go through `_get_token()` which checks `frappe.cache()` first; never fetch a new token if a cached one exists
- DO NOT expose any Jibble endpoints to non-admin users — every endpoint must call `_check_admin()` before doing anything; Jibble data is admin-only
- DO NOT omit `X-Frappe-CSRF-Token` on POST/PUT/DELETE requests from the frontend — Frappe rejects or drops session on state-changing requests without it. Read the token from the `csrf_token` cookie Frappe sets after login. The `getCsrfToken()` helper in `api.ts` handles this; the axios interceptor adds it automatically to all non-GET calls. Value `"fetch"` is the safe fallback.
- DO NOT use specific email or user name for admin auth checks on internal-only endpoints — there are TWO user records for Owais: `name="Administrator"` (has all roles) and `name="owais@veraenterprises.in"` (has only System Manager). `frappe.session.user` returns whichever was authenticated. For internal pages already behind a frontend guard, check `frappe.session.user == "Guest"` instead — it's simpler, correct, and immune to the dual-user ambiguity.
- DO NOT hardcode only email addresses for admin checks — Owais logs in as "Administrator" (the Frappe user name), not "owais@veraenterprises.in". Always check `frappe.get_roles()` for "Administrator" or "System Manager" in addition to the email/name set. Pattern: `current_user in _ADMIN_USERS or "System Manager" in frappe.get_roles(current_user)`.
- DO NOT use native HRMS `Leave Application` DocType — it has complex workflows, allocation rules, and leave type master requirements that conflict with our simple apply/approve flow. Always use `Vera Leave Application` custom DocType instead.
- DO NOT trust a client-sent employee_id — always auto-detect the employee via `frappe.db.get_value("Employee", {"user_id": frappe.session.user, "status": "Active"}, ...)`. The employee field is auto-populated server-side.
- DO NOT forget admin_remarks is required for rejection — backend returns `{"success": false, "error": "Rejection reason is required"}` if missing; frontend enforces this in the reject modal.
- DO NOT call `user_doc.save()` just to update roles — use `frappe.db.delete("Has Role", ...)` + `frappe.db.insert(...)` directly. `user_doc.save()` triggers email notifications, gravatar updates, and other hooks that can fail mid-request.
- DO NOT assign ERPNext roles without first checking they exist — always filter against `frappe.get_all("Role")`. Roles like "Stock Manager" may or may not be present depending on the ERPNext modules installed.
- DO NOT let optional side-effects (like role sync) block the main save — always wrap non-critical operations in a nested `try/except` that logs but does not re-raise. The DocType save is the source of truth; roles are derived.
- DO NOT show a generic "Failed to update X" toast — always propagate the actual `error` field from the backend response to the user. The mutation should `throw new Error(msg.error)` on `success: false`, and the catch block should include `err.message` in the toast.
- DO NOT put `onClick` on a tile div AND `onCheckedChange` on its child Switch — the Switch click bubbles up, calling toggle twice and resetting state. Use `e.stopPropagation()` in `switch.tsx` to prevent bubbling, OR remove the tile-level onClick entirely.
- DO NOT call `get_my_permissions` with an admin check — it is intentionally open to all logged-in users; admin check would make the PermissionsContext fail for non-admins.
- DO NOT compute ERPNext role assignment without using `MODULE_ROLE_MAP` union logic — if you manually assign roles per-module you'll remove shared roles (HR Manager) when only one of many modules is disabled.
- DO NOT call React hooks (useQuery, useState, useMutation, etc.) after a conditional `return` in a component — this violates React Rules of Hooks and causes invariant errors. Move all hooks before any early returns, and use the `enabled` option on `useQuery` to prevent it from fetching when guards fail (e.g., `enabled: !!isAdmin`).
- DO NOT pass `"Administrator"` directly to `_get_employee_by_email` — the Frappe superuser name does not match any `user_id` in the Employee table; always resolve through `_ADMIN_EMAIL_MAP` first (maps `"Administrator"` → `"owais@veraenterprises.in"`).
- DO NOT search `company_email` before `user_id` in employee lookups — `user_id` is the most reliably set field; `company_email` is often empty. Order must be `user_id` → `company_email` → `personal_email`.
- DO NOT navigate from `AdminEmployeesPage` to `/employee/profile/:id` — the admin detail route is `/admin/employees/:email` which is the new 4-tab `AdminEmployeeDetailPage`. The old `/employee/profile/:id` route still exists but is for non-tabbed legacy use only.
- DO NOT add designations outside the 8 Vera Enterprises roles (Manager, Project Manager, Accounts Manager, Accounts Executive, GST & TDS Specialist, Logistics Manager, Stock Monitor, Porter Executive) — all others were deleted; adding new ones via ERPNext desk must be approved
- DO NOT log, print, or expose `VITE_OPENAI_API_KEY` or any env secret — read via `import.meta.env.VITE_*` only, use only in Authorization headers, never in `console.*` or visible UI. AI provider is OpenAI gpt-4o-mini (Gemini free tier exhausted)
- DO NOT put the permission check in `get_employee_profile` BEFORE resolving the employee name — when the caller passes an employee ID (HR-EMP-XXXXX), comparing it against `frappe.session.user` (an email) always fails for non-admins. Always resolve the identifier to an `emp_name` first, then fetch the employee's `user_id`/emails, and compare those against `frappe.session.user`.
- DO NOT access Employee DocType fields by wrong names in `employee_lifecycle.py` — `EmployeeMaster` (HRMS) overrides `__getattr__` and raises `AttributeError` (not `None`) for unknown attributes. Emergency contact fields are `person_to_be_contacted` and `emergency_phone_number`, NOT `emergency_contact_name`/`emergency_contact_phone`. Always use `getattr(emp, "field_name", None)` for any HRMS-model field access outside of `_serialize_employee` in `employee.py` — that function is the authoritative field-name reference.
- DO NOT rely solely on `_get_employee_by_email` for employee lookup — if the identifier is an employee ID (HR-EMP-XXXXX), email-only lookups return None. Always try `frappe.db.exists("Employee", identifier)` as the FIRST check, then fall back to email-based lookups. Lookup order in `get_employee_profile`: direct name → user_id → company_email → personal_email.
- DO NOT update a CRM lead's status directly — all stage transitions must go through a `Vera CRM Approval Request`. Only `approve_stage` (admin-only) may write to `Vera CRM Lead.status`. Any direct `lead.status = new_stage; lead.save()` bypasses the approval workflow.
- DO NOT allow anyone other than `owais@veraenterprises.in` (or `Administrator`) to call `approve_stage` or `reject_stage` — check `frappe.session.user in OWAIS_USERS` at the top and return `{"success": False, "error": "Not authorized"}` immediately. No role-based exception.
- DO NOT make CRM admin-only in the sidebar or frontend routes — CRM is visible to ALL employees. Only the `approve_stage`, `reject_stage`, and `get_pending_approvals` endpoints are restricted to Owais.
- DO NOT use `current_stage_requested` field on `Vera CRM Lead` — this field was removed. Use `stage_push_requested` (Check) to detect if an advance is pending, and `pending_approval` (from `get_lead` response) to get the target stage.
- DO NOT pass `target_stage` to `request_next_stage` — the endpoint auto-calculates the next stage from `STAGE_ORDER`. The old endpoint `request_stage_advance` no longer exists; the new one is `request_next_stage(lead_id, request_notes)`.
- DO NOT allow a second `request_next_stage` call while `stage_push_requested=1` — the backend blocks it ("An approval request is already pending"). The frontend "Push to [next]" button must be hidden/disabled when `stage_push_requested=1`.
- DO NOT omit snapshot fields when creating a `Vera CRM Approval Request` — always copy `lead_title`, `company_name`, `contact_person`, `phone`, `email`, `service_interest` from the lead at time of request, so Owais sees full context without loading the lead separately.
- DO NOT allow `approve_claim` or `reject_claim` to run for any user other than `owais@veraenterprises.in` or `Administrator` — check `frappe.session.user in OWAIS_USERS` at the very top and return `{"success": False, "error": "Not authorized"}` immediately. These endpoints modify financial records.
- DO NOT trust the frontend to send the correct employee ID on claim submission — always auto-detect the employee via `_get_employee()` which looks up `frappe.session.user` through `user_id` → `company_email` → `personal_email`. If no employee is found, return an error. Never accept an `employee` parameter from the client.
- DO NOT use `bg-popover`, `bg-card`, or other Tailwind CSS variable-based backgrounds in UI components — `tailwind.config.js` maps these to `hsl(var(--...))` but `index.css` defines the vars as `oklch(...)`, which is invalid inside `hsl()` and renders as transparent. Always use explicit colors (`bg-white`, `bg-gray-100`) in components.
- DO NOT add new pages (routes) without wrapping them in the `<Layout />` component — the sidebar only renders inside Layout. All routes under `/` (except `/login`) must be nested under `<Route element={<Layout />}>` in App.tsx, or the sidebar will be absent on that page.
- DO NOT use unstyled native `<select>` dropdowns without explicit `background-color: #FFFFFF; color: #0F172A` — CSS variable-based backgrounds resolve to transparent on native selects. The global rule in `index.css` covers all `select, select option` but any custom className that sets a bg color will override it; always use `bg-white text-gray-900` or inline style.
- DO NOT display `reports_to` raw employee ID (e.g. "HR-EMP-00001") anywhere in the UI — always show `reports_to_name` which is resolved in `_serialize_employee` via `frappe.db.get_value("Employee", doc.reports_to, "employee_name")`. The raw ID is only useful for internal lookups.
- DO NOT save bank details (bank_name, account_number, IFSC) to Employee DocType unless the custom fields exist — the authoritative store is the ERPNext `Bank Account` DocType (party_type=Employee). Current implementation saves to Employee custom fields (`bank_name`, `bank_ac_no`, `custom_ifsc_code`) as a shortcut; a future migration to `Bank Account` DocType will be needed before go-live.
- DO NOT use a narrow centered column (`max-w-4xl`) for the profile page — the profile uses a full-width two-column grid layout (`grid-cols-1 lg:grid-cols-5`). Left 2/5 = Personal Info + Documents; right 3/5 = Work Info + Bank Details; Skills full-width at bottom. Always use this grid pattern for profile-style pages.
- DO NOT mask Aadhaar/PAN numbers in `get_employee_profile` for the requesting user's own profile — non-admins can only reach the endpoint for their own record (PermissionError thrown otherwise), so masking their own data is unnecessary. Only mask when admin views another employee's data (current code doesn't do this — both admin and self get full values).
- DO NOT navigate to `/recruitment/:jobOpening` — the old combined route no longer exists. The kanban pipeline view is now at `/recruitment/pipeline/:jobOpening` (rendered by `PipelinePage.tsx`). `/recruitment` is the job card listing only.
- DO NOT hide or scroll away the Profile page header when switching tabs — the `ProfileHeader` must always be rendered above the tab bar and tab content, regardless of which tab is active.
- DO NOT enter edit mode from any tab other than Profile — `handleEditClick()` must call `switchTab("profile")` before setting `editMode=true`. Clicking Edit from Attendance or Leave History tabs must silently switch to Profile tab first.
- DO NOT show the user profile at the top of the sidebar — profile (avatar + name + email) appears ONLY at the bottom section above Sign Out. The top profile pill was removed; do not re-add it.
- DO NOT use `onClick={() => {}}` as a placeholder for navigation — always use `useNavigate()` from React Router for internal page transitions. Never use `window.location.href` for internal SPA routes.
- DO NOT forget to add "Happy Holiday" to the `LEAVE_TYPES` const array in `types.ts` AND to the `vera_leave_application.json` DocType options string AND run `bench migrate` — all three must stay in sync.
- DO NOT link the Holidays sidebar item to `/admin/attendance?tab=holidays` — Holidays is at `/holidays` (standalone page, accessible to all employees, not admin-only). `isAttendanceActive` no longer needs a search-param exclusion.
- DO NOT call `get_holidays` or `get_leave_policy` with admin checks — these return public policy data that every employee should see.
- DO NOT forget to always show "days until next holiday" on the holidays page calendar tab — it is a required element per spec (banner below summary cards).
- DO NOT use `items-end` on the profile header info row — it causes the employee name (h1, first element in the text div) to render inside the gradient banner and be hidden. The correct pattern is `items-start` on the flex row + `paddingTop: "44px"` on the text div to push text below the banner edge while keeping the avatar correctly centered at the banner bottom.
- DO NOT forget `flex-shrink: 0` (or Tailwind `shrink-0`) on the profile avatar wrapper — without it, when the text div grows (e.g. long names), the avatar can compress horizontally, distorting the circle shape.
- DO NOT render the tab bar when viewing another employee's profile as admin — `showTabs = isSelf` is the gate; when `isSelf=false` the tab bar is hidden and Profile content is shown directly (no attendance/leave tabs for admin-view-of-other).
- DO NOT allow `close_job_opening` or `delete_job_opening` to run for anyone other than `owais@veraenterprises.in` or `Administrator` — both are Owais-only; `delete_job_opening` cascades deletion to all linked Job Applicants, Interviews, and Job Offers.
- DO NOT call `delete_job_opening` without first deleting all child records — delete linked Interviews and Job Offers per applicant before deleting the Job Applicant, then delete the Job Opening itself. Skipping cascade will cause FK/link constraint errors in Frappe.

---

## ERPNext Rules & Limitations (CRITICAL)
_Sourced from frappe v15 / erpnext / hrms source code. Read before writing a single line._

### DocType JSON Structure

Every DocType lives in `my_app/my_app/doctype/<doctype_name>/` as two files:
- `<doctype_name>.json` — schema definition
- `<doctype_name>.py` — Python controller class

**Mandatory JSON keys:**
```json
{
  "doctype": "DocType",
  "name": "My DocType",
  "fields": [...],
  "permissions": [...]
}
```

**All valid fieldtypes:**
```
Autocomplete, Attach, Attach Image, Barcode, Button, Check, Code, Color,
Column Break, Currency, Data, Date, Datetime, Duration, Dynamic Link,
Float, Fold, Geolocation, Heading, HTML, HTML Editor, Icon, Image, Int,
JSON, Link, Long Text, Markdown Editor, Password, Percent, Phone,
Read Only, Rating, Section Break, Select, Signature, Small Text,
Tab Break, Table, Table MultiSelect, Text, Text Editor, Time
```

**Key field attributes:**
| Attribute | Values | Effect |
|---|---|---|
| `reqd` | 0/1 | Mandatory field |
| `unique` | 0/1 | DB-level uniqueness |
| `in_list_view` | 0/1 | Show in list view columns |
| `read_only` | 0/1 | Non-editable |
| `allow_on_submit` | 0/1 | Editable after submit |
| `no_copy` | 0/1 | Excluded when duplicating |
| `fetch_from` | `"link_field.fieldname"` | Auto-fills from linked doc |
| `options` | DocType name or `\n`-separated | Link target or Select choices |
| `default` | string | Default value |
| `depends_on` | JS expression | Conditional visibility |
| `insert_after` | fieldname | Position in form layout |

**autoname patterns:**
```
"field:fieldname"           → use field value as name
"naming_series:"            → use naming_series widget
"hash"                      → 10-char hash
"autoincrement"             → integer auto-increment
"HR-SUB-.YYYY.-.MM.-.####" → prefix + year + month + padded counter
```
Naming series format: prefix segments separated by `.`, `#` = digit padding. Counter stored in `tabSeries` table.

**Child tables:**
- Requires a separate DocType JSON with `"istable": 1` and `"permissions": []`
- Parent references child via `"fieldtype": "Table", "options": "Child DocType Name"`
- Child rows have: `parent`, `parenttype`, `parentfield`, `idx` (1-based)

---

### Controller Hooks — Full List & Order

```python
from frappe.model.document import Document

class MyDocType(Document):
    # --- Insert flow ---
    def before_validate(self): ...   # Before validate, on every save
    def validate(self): ...          # Main validation — raise here to block save
    def before_insert(self): ...     # Before first save only
    def after_insert(self): ...      # After first save only

    # --- Save (update) flow ---
    def before_save(self): ...       # Before insert OR update
    def on_update(self): ...         # After insert OR update

    # --- Submit flow ---
    def before_submit(self): ...
    def on_submit(self): ...         # docstatus = 1

    # --- Cancel flow ---
    def before_cancel(self): ...
    def on_cancel(self): ...         # docstatus = 2

    # --- Delete flow ---
    def before_trash(self): ...
    def on_trash(self): ...

    # --- Special ---
    def on_change(self): ...         # After any field changes (not saved)
    def has_permission(self): ...    # Custom permission check
```

**Critical rules:**
- Call `super().validate()` if your class inherits from anything other than `Document`
- Raise `frappe.throw()` inside `validate()` to block save with a user-visible error
- Never call `self.save()` inside `validate()`, `before_save()`, or `on_update()` — infinite loop
- `self.db_set(field, value)` updates DB directly, skips all hooks; use only for status fields after submit
- `self.flags.ignore_permissions = True` disables permission checks for that document instance

**Accessing linked document values:**
```python
# Cheap: single field, no doc instantiation
employee_name = frappe.db.get_value("Employee", self.employee, "employee_name")

# Full doc (costs more, loads all fields + children)
emp_doc = frappe.get_doc("Employee", self.employee)
```

**Child table manipulation:**
```python
# Read
for row in self.get("items"):
    print(row.item_code, row.qty, row.idx)

# Add
self.append("items", {"item_code": "X", "qty": 5})

# Remove (by reference)
self.remove(row)

# Saving parent auto-saves all children
self.save()
```

---

### Whitelisted API Methods — Rules

```python
import frappe

@frappe.whitelist()
def session_only_endpoint(param1, param2=None):
    """Requires logged-in session. Params from query string or JSON body."""
    frappe.has_permission("MyDocType", throw=True)
    return {"result": frappe.db.get_list("MyDocType", ...)}

@frappe.whitelist(allow_guest=True)
def public_webhook(form_id, data):
    """No auth required. Use ONLY for webhooks from external services."""
    pass

@frappe.whitelist(methods=["POST"])
def create_only(name):
    """Restricted to POST requests only."""
    pass
```

**Parameter rules:**
- All params come in as **strings** from query string — cast explicitly (`int()`, `json.loads()`, etc.)
- JSON body params come in pre-parsed if `Content-Type: application/json`
- `frappe.form_dict` holds all merged params (query + body)
- List/dict params from JSON body arrive as Python objects; from query string arrive as JSON strings

**Return value wrapping:**
```
Your return value    →  HTTP response body
{"key": "val"}       →  {"message": {"key": "val"}, "exc": null}
"string"             →  {"message": "string"}
None                 →  {"message": null}
```

**Setting custom status codes:**
```python
frappe.response.http_status_code = 404
frappe.response["message"] = {"error": "Not found"}
return  # Do NOT return a value when setting response manually
```

**Auth check pattern (use in every non-guest endpoint):**
```python
@frappe.whitelist()
def get_submission(name):
    frappe.has_permission("Form Submission", ptype="read", throw=True)
    doc = frappe.get_doc("Form Submission", name)
    doc.check_permission("read")
    return doc.as_dict()
```

---

### Custom Fields vs New DocTypes

| Scenario | Use |
|---|---|
| Adding fields to Employee, Leave Application, etc. | **Custom Field** (never touch core) |
| Entirely new entity (Form Template, Form Submission) | **New DocType** in hr_client |
| Changing field properties (label, reqd, etc.) | **Property Setter** |

**Fixtures approach (recommended — ships with app):**

1. Create `hr_client/fixtures/custom_field.json`:
```json
[
  {
    "doctype": "Custom Field",
    "name": "Employee-custom_jibble_id",
    "dt": "Employee",
    "fieldname": "custom_jibble_id",
    "fieldtype": "Data",
    "label": "Jibble Employee ID",
    "insert_after": "employee_name"
  }
]
```

2. Register in `hooks.py`:
```python
fixtures = [
    {"dt": "Custom Field", "filters": [["name", "like", "%-custom_%"]]}
]
```

3. Export: `bench --site hrms.localhost export-fixtures`
4. Import: runs automatically on `bench migrate`

**Custom Field naming convention:** `DocType-fieldname` (e.g., `"Employee-custom_jibble_id"`)

---

### Permission System

**Standard HRMS roles (use these in DocType permissions):**
- `System Manager` — full access
- `HR Manager` — read/write/submit all HR documents
- `HR User` — limited read/write
- `Employee` — read own records only

**DocType permission entry format (in JSON):**
```json
"permissions": [
  {"role": "HR Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "submit": 1, "cancel": 1},
  {"role": "HR User", "read": 1, "write": 1, "create": 1},
  {"role": "Employee", "read": 1, "if_owner": 1}
]
```

**`if_owner: 1`** — user can only read/write their own records.

**Row-level filtering (get_permission_query_conditions):**
```python
# In my_module.py
def get_permission_query_conditions(user):
    if "HR Manager" in frappe.get_roles(user):
        return ""  # No filter, see all
    emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
    return f"`tabForm Submission`.employee = {frappe.db.escape(emp)}"

# In hooks.py
permission_query_conditions = {
    "Form Submission": "hr_client.api.forms.get_permission_query_conditions"
}
```

**Document-level check (has_permission):**
```python
# In my_module.py
def has_permission(doc, ptype, user):
    if "HR Manager" in frappe.get_roles(user):
        return True
    return doc.submitted_by == frappe.session.user

# In hooks.py
has_permission = {
    "Form Submission": "hr_client.api.forms.has_permission"
}
```

---

### Exception Handling

**Key exception classes (from `frappe.exceptions`):**
```python
frappe.ValidationError        # HTTP 417 — default, use for bad input
frappe.PermissionError        # HTTP 403 — access denied
frappe.DoesNotExistError      # HTTP 404 — document not found
frappe.AuthenticationError    # HTTP 401 — not logged in
frappe.DuplicateEntryError    # HTTP 409 — unique constraint violated
frappe.LinkValidationError    # HTTP 417 — broken Link field
frappe.UniqueValidationError  # HTTP 417 — unique field conflict
frappe.UpdateAfterSubmitError # HTTP 417 — tried to edit submitted doc
frappe.DocumentLockedError    # HTTP 417 — doc locked by another user
```

**`frappe.get_doc()` raises `DoesNotExistError` — never returns None:**
```python
try:
    doc = frappe.get_doc("Form Template", name)
except frappe.DoesNotExistError:
    frappe.response.http_status_code = 404
    return {"error": "Form template not found"}
```

**`frappe.db.get_value()` returns None — never raises:**
```python
value = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
if not value:
    frappe.throw("No employee record found for current user")
```

---

### hooks.py — Important Patterns

```python
# Hooking into existing DocType events (extend without modifying core)
doc_events = {
    "Employee": {
        "after_insert": "hr_client.overrides.employee.after_insert",
        "on_update":    "hr_client.overrides.employee.on_update",
    },
    "Leave Application": {
        "on_submit": "hr_client.api.forms.sync_leave_to_submission",
    },
}

# Override a core whitelisted method
override_whitelisted_methods = {
    "hrms.hr.doctype.leave_application.leave_application.get_leave_balance_on":
        "hr_client.overrides.leave.get_leave_balance_on"
}

# Scheduled background jobs
scheduler_events = {
    "daily": ["hr_client.api.jibble.sync_attendance"],
    "cron": {
        "0 9 * * 1-5": ["hr_client.api.jibble.morning_sync"],  # 9am weekdays
    },
}

# Fixtures to sync on migrate
fixtures = [
    {"dt": "Custom Field", "filters": [["name", "like", "%-custom_%"]]}
]

# CORS (needed for React frontend on different port)
allow_cors = "*"
```

**doc_events handler signature:**
```python
def after_insert(doc, method=None):
    """doc = the document being saved, method = event name string"""
    pass
```

---

### Migration & Patches

**`bench migrate` runs in this order:**
1. Pre-model-sync patches (`patches.txt` → `[pre_model_sync]` section)
2. Sync all DocType schemas (creates/alters DB tables)
3. Post-model-sync patches (`patches.txt` → `[post_model_sync]` section)
4. Sync scheduled jobs
5. Sync fixtures (Custom Fields, Property Setters)
6. Clear cache

**Always run after migrate:**
```bash
bench --site hrms.localhost migrate && bench --site hrms.localhost clear-cache
```

**Writing a patch** (`hr_client/patches/v1_0/my_patch.py`):
```python
import frappe

def execute():
    # Safe to use frappe.db here — schema is already synced (post_model_sync)
    frappe.db.sql("UPDATE `tabForm Submission` SET status = 'Pending' WHERE status IS NULL")
    frappe.db.commit()
```

Register in `patches.txt`:
```
[post_model_sync]
hr_client.patches.v1_0.my_patch
```

**Patch rules:**
- Each patch runs exactly once (tracked in `tabPatch Log`)
- Pre-model-sync patches run BEFORE schema changes — do not reference new columns
- Post-model-sync patches run AFTER schema is ready — safe to use new columns
- Never remove a patch from patches.txt — add new ones instead

---

### Extending HRMS Without Touching Core

**Pattern 1 — New DocType (safest):**
Create entirely new DocTypes in `hr_client/doctype/`. Nothing touches core.

**Pattern 2 — Override doctype class:**
```python
# hooks.py
override_doctype_class = {
    "Employee": "hr_client.overrides.employee.CustomEmployee"
}

# hr_client/overrides/employee.py
from hrms.hr.doctype.employee.employee import Employee

class CustomEmployee(Employee):
    def validate(self):
        super().validate()  # ALWAYS call super first
        self.validate_custom_fields()

    def validate_custom_fields(self):
        if self.custom_jibble_id and not self.custom_jibble_id.isdigit():
            frappe.throw("Jibble ID must be numeric")
```

**Pattern 3 — doc_events hook (least invasive):**
```python
# hooks.py
doc_events = {
    "Employee": {
        "after_insert": "hr_client.overrides.employee.set_jibble_defaults"
    }
}

# No override of the class — just a standalone function
def set_jibble_defaults(doc, method=None):
    if not doc.custom_jibble_id:
        doc.db_set("custom_jibble_id", generate_jibble_id(doc))
```

**Pattern 4 — Custom Fields via fixtures:**
Add fields to existing DocTypes without any Python — just JSON + `bench migrate`.

**Rule of thumb:** Use Pattern 4 first, Pattern 3 second, Pattern 2 last. Never Pattern 0 (editing core files).

---

## Frappe Best Practices

### Code Organization
```
hr_client/hr_client/
  doctype/
    form_template/         ← one folder per DocType
      form_template.json
      form_template.py
    form_submission/
      form_submission.json
      form_submission.py
  api/
    forms.py               ← whitelisted endpoints grouped by domain
    jibble.py
  overrides/
    employee.py            ← doc_events handlers and class overrides
  fixtures/
    custom_field.json      ← Custom Fields shipped with app
  patches/
    v1_0/
      initial_setup.py
  hooks.py
  patches.txt
```

### Always Do
- `super().validate()` first in every controller that inherits from non-Document
- `frappe.has_permission(doctype, throw=True)` at the top of every whitelisted endpoint
- Return `doc.as_dict()` not `doc` from whitelisted methods (prevents serialization issues)
- Use `frappe.db.get_value()` for single-field lookups, `frappe.get_doc()` only when you need the full document
- Use `frappe.get_all()` for list queries with filters — it respects permissions
- Use `frappe.db.escape()` around any user-supplied string in raw SQL
- Add `try/except frappe.DoesNotExistError` around every `frappe.get_doc()` call in API methods
- Cast string params explicitly in whitelisted methods: `page = int(frappe.form_dict.get("page", 1))`
- Log with `frappe.log_error(frappe.get_traceback(), "Context Title")` for background job failures
- Commit with `frappe.db.commit()` after mutations in scheduler jobs (not needed in request context)

### Never Do
- Never call `frappe.db.sql()` with unsanitized user input — always use `frappe.db.escape()`
- Never call `self.save()` inside `validate()` or `before_save()`
- Never `import frappe` inside a function body — import at module top
- Never assume `frappe.session.user` in `allow_guest=True` endpoints — it will be `"Guest"`
- Never use bare `except:` — always catch specific exceptions
- Never commit inside a validate hook — Frappe manages transactions per request
- Never store secrets in code or DocType defaults — use `frappe.conf` (site_config.json)
