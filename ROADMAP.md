# OrthoCore Build Roadmap

Each phase is a working, runnable increment — not a stub. Phases build directly on the
Prisma schema and module structure established in Phase 1.

## Phase 1 — Foundation ✅ (this delivery)
- Project structure, TypeScript config, env management, logging, centralized error handling
- Full baseline Prisma schema: Users, Roles, Permissions, Departments, Patients,
  MedicalHistory, configurable Form Engine (FormTemplate/Section/Field/Response), AuditLog
- JWT auth (access + refresh tokens), bcrypt hashing
- RBAC middleware (`authenticate`, `requirePermission`, `requireRole`, `requireSameDepartment`)
- Seed script: permission catalogue, 4 baseline roles, default Orthodontics department, admin user

## Phase 2 — User Management, Departments, Patient Management ✅ (this delivery)
- Full CRUD for users (admin-only): create, list/search/paginate, update role/department/status,
  admin password reset, self-service password change, soft-disable (preserves audit trail)
- Department CRUD (admin-only, gated by `system.config` permission) — add Endodontics,
  Periodontics, etc.; all authenticated users can list active departments for dropdowns
- Patient registration with auto-generated sequential file numbers (`P-YYYY-NNNNNN`), search
  by name/file number/phone, update, archive/restore, multi-department enrollment
- Medical history CRUD, gated separately behind `medical_history.manage` (Assistant role does
  NOT have this permission per the spec — no access to confidential clinical data)
- React + TypeScript + Tailwind frontend: axios client with automatic access-token refresh on
  401, AuthContext, role-aware protected routing, login flow, patients list/search/detail/registration UI

## Phase 3 — Clinical Examinations, Diagnosis, Treatment Planning ✅ (this delivery)
- Form Engine admin API: full CRUD for templates/sections/fields, enable/disable, reorder
  endpoints, all gated by `system.config` permission
- Generic `FormResponse` write path shared by Examination/Diagnosis/Treatment Plan, with
  dynamic permission enforcement per module (`examinations.manage`, `diagnoses.manage`,
  `treatment_plans.manage`) so the same engine can't be used to bypass RBAC
- Server-side required-field validation against the live template definition before saving
- Seed data: Orthodontics examination form (Extraoral/Intraoral/Occlusion Analysis sections),
  Diagnosis form, and Treatment Plan form — all fields mapped directly from the uploaded
  record form, including the treatment type catalogue (fixed/removable/aligners/orthopedic/
  surgical/interceptive)
- Frontend `FormRenderer`: a single component that renders any template (any department, any
  module) purely from its section/field metadata — this is what makes the system extensible
  to new departments with zero frontend code changes
- Admin Form Builder UI: create templates, add/delete sections, add/delete/enable/disable
  fields, scoped per department + module
- Clinical Examination / Diagnosis / Treatment Plan pages wired onto each patient's record,
  loading the active template for the patient's enrolled department and showing their latest saved values

## Phase 4 — Appointments & Scheduling, Form Builder Enhancement ✅ (this delivery)
- Appointment schema: status machine (SCHEDULED→CONFIRMED→CHECKED_IN→COMPLETED, or CANCELLED/NO_SHOW),
  provider conflict detection, cascade reminders on create
- Backend: list/get/create/reschedule/cancel/confirm/check-in/complete/no-show endpoints, all
  permission-gated (Assistants can schedule; only Orthodontists/Admins can complete)
- Reminder scheduler: background job (60s poll) dispatching PENDING reminders via pluggable
  NotificationProvider — swap in Twilio/SES at deployment, nothing else changes
- Waiting list CRUD, FIFO-ordered per department
- Frontend Calendar: week-view grid, appointment blocks colour-coded by status, click-to-book
  on any day/time, appointment detail drawer with one-click status transitions and reschedule
- AppointmentModal: live patient search autocomplete, department→provider cascade, datetime pickers,
  reason/notes, auto-reminder note
- Waiting List page: search-and-add patients, filter by department, remove entries
- Form Builder completely rebuilt — no browser prompt() dialogs:
  - OptionsEditor: inline add/edit/remove/reorder options per SELECT/RADIO/MULTISELECT field
  - FieldEditorPanel: edit label/type/options/required/enabled inline, collapsible per field
  - NewFieldForm: full inline new field form with auto snake_case key generation
  - SectionEditorPanel: rename sections inline, move up/down, enable/disable, delete
  - All seeded options now exactly match the uploaded Orthodontic Record Form (medical history,
    extraoral/intraoral/occlusion examination, diagnosis, treatment plan with full appliance catalogue)

## Phase 5 — File & Image Management, Dual DB, Swappable Storage ✅ (this delivery)
- Schema updated: `provider = env("DATABASE_PROVIDER")` — Prisma reads "sqlite" or "postgresql"
  from the environment; same codebase, same schema, both work
- `ilike()` utility: abstracts `mode:"insensitive"` (PostgreSQL only) so all search queries
  work on SQLite without changes
- Three env example files: `.env.example` (generic), `.env.sqlite.example`, `.env.postgresql.example`
- `npm run setup:sqlite` / `npm run setup:pg` convenience scripts
- Storage abstraction: `StorageProvider` interface with two implementations:
  - `LocalStorageProvider`: writes to any writable directory, serves via authenticated Express
    route (`GET /api/files/serve/:fileId`) with path-traversal protection — works on shared hosting
  - `ImageKitStorageProvider`: uploads via ImageKit Node.js SDK, auto-generates 200×200 thumbnails
    via transformation URL, stores ImageKit's fileId for deletion
  - Switch by changing `STORAGE_PROVIDER=local|imagekit` and restarting — zero code changes
- `ClinicalFile` model: category (INTRAORAL_PHOTO, EXTRAORAL_PHOTO, PANORAMIC_XRAY,
  CEPHALOMETRIC_XRAY, CBCT, STUDY_MODEL, DOCUMENT, OTHER), storage-provider-agnostic fields
  (storageProvider, fileId, url, thumbnailUrl, filename, mimeType, size, notes)
- Files API: upload (multer memoryStorage → provider), list per patient + category filter,
  get, update notes/category, delete (removes from storage + DB)
- Frontend: `FileUploadZone` (drag-and-drop + click, multi-file queue, per-file progress),
  `FileThumbnailCard` (thumbnail/icon, inline notes edit, download), `ImageLightbox`
  (full-screen viewer, keyboard nav ←→/Esc, metadata strip), `PatientFilesPage`
  (category tabs with counts, gallery grid, upload panel)

## Phase 6 — PDF Reports & Analytics Dashboard ✅ (this delivery)
- `PdfBuilder` wrapper over PDFKit: brand header bar, section headings, key-value rows,
  tag rows (for multi-select values), text blocks, page-aware layout (auto page breaks),
  per-page footer with page numbers and generation timestamp
- **Patient Summary PDF**: demographics, medical history (conditions/allergies/medications/
  habits), full extraoral + intraoral + occlusion examination, diagnosis, treatment plan
  (objectives, appliances, extractions, retention) — all sourced live from form responses
- **Patient ID Card PDF**: compact A5-ish card with branded header, patient demographics,
  photo placeholder box, issue date; suitable for printing and laminating
- **Daily Appointment Schedule PDF**: filtered by date + optional provider, lists all
  non-cancelled appointments with patient, department, provider, time, reason
- Reports page: patient search autocomplete, date + provider filters, one-click PDF
  generation that opens inline in the browser for printing or saving
- Quick PDF links on every patient detail page (Summary + ID Card)
- **Analytics Dashboard** — live data, 60-second auto-refresh:
  - 8 stat cards: active patients, new this month, today's appointments, pending,
    completed this month, waiting list size, pending reminders, departments
  - Bar chart: appointments per month (last 6 months) via recharts
  - Donut/pie chart: appointment status breakdown with brand colours per status
  - Line chart: new patient registrations per month (last 6 months)
  - Pie chart: patient distribution across departments
  - Upcoming appointments table (next 8) with status badges and links
  - Recently registered patients table (last 5) with initials avatar
  - All chart data aggregated in JS — compatible with both SQLite and PostgreSQL

## Phase 7 — Research Module & Audit Log ✅ (this delivery)
- `ResearchRequest` + `ResearchDataset` models; `ANON_SALT` env var in all example files
- Anonymization: patient IDs → HMAC-SHA256 hash (same patient = same anon_id, no PII);
  birth dates → age groups; name/file number/phone stripped entirely
- Research lifecycle: PENDING → APPROVED / DENIED with review notes
- Researcher selects exactly which 30 clinical fields to request (exam findings, diagnosis,
  treatment types, medical history variables)
- Approved: JSON preview (50 rows), full CSV export, frequency-table statistics
- Each export logged to `ResearchDataset`; admin can see export count per request
- Admin research queue: approve/deny UI, expandable detail, review notes, one-click CSV
- `audit()` utility: fire-and-forget, AuditAction constant catalogue
- Audit Log viewer (admin-only): paginated, filterable by action/entity/date/search,
  expandable metadata JSON, colour-coded action badges, meta endpoint for filter dropdowns
- Navigation sidebar rebuilt: role-aware sectioned layout per role

## Phase 8 — System Config, Backup/Restore, Deployment ✅ (this delivery)
- `SystemConfig` model: key-value store for admin-editable settings (clinic info,
  appointment defaults, registration behaviour, file limits, reminder timing)
- System Settings admin page: grouped sections, inline editing, unsaved-change indicators,
  save-all in one request
- Backup/Restore module: SQLite → copies .db file; PostgreSQL → runs pg_dump;
  both stored in ./backups/, downloadable via authenticated endpoint, deletable
- Backup page: create-now button, backup list with size + timestamp, download links,
  one-click delete, restore instructions for both SQLite and PostgreSQL
- Self-registration with admin approval (Phase 7b complete):
  - /register page: full name, email, password, role selector (Orthodontist/Assistant/
    Researcher), department, reason for access
  - PENDING status until admin reviews
  - Admin Registrations page: tabs (Pending/Approved/Denied), expandable detail,
    optional note field, Approve and Deny buttons
  - Gmail notification sent immediately on both approve and deny (or logged to console
    in local dev when Gmail not configured)
  - Live pending count badge in the admin sidebar nav
- nginx/orthocore.nginx.conf: production Nginx config serving SPA + proxying /api,
  with security headers, gzip, static asset caching, 30 MB upload limit
- ecosystem.config.js: PM2 config for production process management
- deploy.sh: one-command deployment script (Node version check, npm ci, Prisma migrate,
  build, PM2 start/reload)
- All services used are 100% free: SQLite (built-in), PostgreSQL (open source),
  local disk storage, Gmail SMTP App Password (500 emails/day free), all npm packages MIT
