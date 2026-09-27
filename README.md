# OrthoCore — Multi-Specialty Dental & Orthodontic Patient Management System

## ✅ 100% Free — No Paid Subscriptions Required

| Component | Free Option |
|---|---|
| Database (local dev) | **SQLite** — built into Node.js, no install |
| Database (production) | **PostgreSQL** — free & open source, self-host on any VPS |
| File storage | **Local disk** — any folder on any server |
| File storage (optional CDN) | **ImageKit free tier** — 20 GB storage + 20 GB/month |
| Email notifications | **Gmail SMTP + App Password** — 500 free emails/day |
| All npm packages | MIT / open source |

---

## Quick Start (Local Dev — SQLite, no external services)

```bash
cd backend
cp .env.sqlite.example .env     # already configured for local dev

npm install
npm run prisma:push             # creates dev.db — no migration files needed
npm run prisma:seed             # roles, permissions, department, admin user
npm run prisma:seed:forms       # all form templates from the orthodontic record form
npm run dev                     # API starts on http://localhost:4000
```

```bash
cd frontend
npm install
npm run dev                     # UI starts on http://localhost:5173
```

**Default admin:** `admin@orthocore.local` / `ChangeMe123!`
*(Change this immediately via the profile page or user management.)*

> **Email in local dev:** Without Gmail config, emails are printed to the backend console.
> You can see approval/denial emails in the terminal — no Gmail needed locally.

---

## Gmail Email Setup (Free, 2 minutes)

You only need a Gmail account — no paid plan:

1. Sign in to your Google Account
2. Enable **2-Step Verification**: [myaccount.google.com/security](https://myaccount.google.com/security)
3. Go to **App Passwords**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. App → **Mail**, Device → **OrthoCore** → Generate
5. Copy the 16-character password and paste it in `.env`:

```env
GMAIL_USER=yourname@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

**Free limit:** 500 emails/day — more than sufficient for any clinic.

---

## Production Setup (PostgreSQL + Gmail)

```bash
cd backend
cp .env.postgresql.example .env
# Edit .env: fill in DATABASE_URL, JWT secrets, Gmail credentials

npm install
npm run prisma:migrate:deploy   # creates tables with migration history
npm run prisma:seed
npm run prisma:seed:forms
npm run build

npm install -g pm2
pm2 start dist/server.js --name orthocore-api
pm2 save && pm2 startup
```

**Free PostgreSQL hosting options:**
- **Self-hosted** on any VPS (DigitalOcean, Hetzner, etc.) — most common
- **Neon** → [neon.tech](https://neon.tech) — 512 MB free tier
- **Supabase** → [supabase.com](https://supabase.com) — 500 MB free tier
- **Railway** → [railway.app](https://railway.app) — 1 GB free tier

---

## Switching Database (no code changes)

```env
# SQLite (local dev)
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:./dev.db"

# PostgreSQL (production)
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://user:pass@host:5432/orthocore"
```

Then run `npm run prisma:push` (SQLite) or `npm run prisma:migrate:deploy` (PostgreSQL).

---

## Switching File Storage (no code changes)

```env
# Local disk — completely free, works on any host
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage
SERVER_BASE_URL=http://localhost:4000

# ImageKit — free tier: 20 GB storage + 20 GB bandwidth/month
STORAGE_PROVIDER=imagekit
IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_PRIVATE_KEY=private_...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

---

## User Registration Flow

1. User visits `/register`, fills in name, email, password, role, department, reason
2. Account created with `status: PENDING` — cannot log in yet
3. User receives a "Registration received" email
4. Admin sees pending count badge in sidebar → Registrations page
5. Admin expands the request, reads the reason, writes an optional note
6. Admin clicks **Approve** or **Deny**
7. User immediately receives a branded Gmail notification with the outcome
8. Approved users can now log in

---

## Health Check

```bash
curl http://localhost:4000/health
# → { status:"ok", env:"development", db:"sqlite", storage:"local", email:"console (dev stub)" }
```

---

## Modules Status

| Phase | Module | Status |
|---|---|---|
| 1 | Auth, RBAC, DB schema | ✅ |
| 2 | Users, Departments, Patients, Medical History | ✅ |
| 3 | Configurable Form Engine, Examinations, Diagnosis, Treatment Plan | ✅ |
| 4 | Appointments, Calendar, Waiting List, Reminders | ✅ |
| 5 | File Management, ImageKit/Local storage, SQLite/PostgreSQL dual DB | ✅ |
| 6 | PDF Reports, Analytics Dashboard | ✅ |
| 7 | Research Module (anonymisation), Audit Log | ✅ |
| 7b | Self-registration with admin approval + Gmail notifications | ✅ |
| 8 | System Config UI, Backup/Restore, Nginx config, PM2, deploy script | ✅ |
| 9 | Admin Users & Departments management UI, Roles API, Progressive Web App (installable, offline app shell) | ✅ |

---

## Progressive Web App

OrthoCore is installable on desktop and mobile:

1. Build and serve the frontend over HTTPS (or `localhost` for testing) — service workers require a secure origin.
2. Open the app in Chrome, Edge, or Safari.
3. **Desktop Chrome/Edge:** click the install icon in the address bar, or use the "⤓ Install OrthoCore" button in the sidebar.
4. **Android Chrome:** menu → "Install app" (or the in-app install button).
5. **iOS Safari:** Share → "Add to Home Screen" (iOS does not support the install-prompt API, so use this manual step).

**What works offline:** the app shell (login screen, navigation chrome, static assets) and a clear
offline notice/fallback page.
**What does NOT work offline (by design):** any patient data, medical images, or API response —
the service worker (`frontend/public/sw.js`) explicitly never caches `/api/*` requests, so no
confidential clinical information is ever stored on the device. A banner appears whenever the
device loses connectivity.

---

## Admin: Users & Departments

- **`/admin/users`** — create staff accounts (name, email, temp password, role, department),
  change a user's role/department inline, reset passwords, disable/re-enable accounts.
- **`/admin/departments`** — add a new department (name + auto-generated code, editable),
  rename, activate/deactivate. New departments immediately become available across patient
  enrollment, appointments, and the Form Builder — no code changes needed.
- Both pages call `/api/users`, `/api/roles`, and `/api/departments`, all of which already existed
  on the backend; only the admin UI was missing before.
