# DEIS — DOrSU Enrollment Information System

A web-based Enrollment Information System with role-based access and an analytics dashboard for **Davao Oriental State University (DOrSU)**, built for the capstone project of CCET, DOrSU.

## Stack

- **Frontend:** React 18 (Vite), Tailwind CSS, fetch-based API client
- **Backend:** Node.js / Express, Prisma ORM (PostgreSQL), Zod validation, Vitest integration tests
- **Auth:** HTTP-only session cookie (JWT), role-based access control, account lockout on failed logins, token versioning (password change invalidates all sessions)

## Modules

| Module | Description |
| --- | --- |
| Student onboarding | Verify student number → activate credentials → sign in |
| Student Profile Form (SPF) | Digitized FM-DOrSU-ODI-05 (application, personal, family, educational background); required before first enrollment |
| Enrollment | Subject selection with prerequisite/seat/term validation, submit → registrar review (approve/reject/withdraw) |
| Clearance | Per-term office sign-offs (Library, Finance, Department, Guidance, Registrar) — student progress view + registrar review |
| Calendar of Activities | University activities with audience targeting (all / students / faculty / admin) |
| Grades | Faculty grade encoding + finalization (Prelim/Midterm/Final → 1.0–5.0), student grade viewer |
| Analytics | Headcount, term-over-term growth, program demand, section occupancy, grade distribution (+ CSV export) |
| AI assistant | Chat widget in the app shell — answers enrollment questions with live user context (see below) |
| Administration | User accounts, academic terms, catalog (campuses, programs, subjects, prerequisites), activity log |

## Roles

- **Student** — enroll, track requests, view grades and clearance
- **Faculty** — my sections, grade encoding
- **Registrar** — review enrollment requests, students, sections, clearance, analytics
- **Admin** — everything above + user accounts, terms, catalog, audit log

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL (PostgreSQL), JWT_SECRET
npm install
npm run db:reset            # creates schema + seeds demo data (8 programs, 32 students, 108 sections)
npm run dev                 # API on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # app on http://localhost:5173 (proxies /api to :4000)
```

### 3. AI assistant (optional)

The chat widget runs in offline "rule-based" mode by default. To enable LLM answers from **Groq** (free tier):

1. Create a key at https://console.groq.com/keys
2. Add it in `backend/.env`:

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile   # optional, default shown
```

Without the key, `/api/chat` returns structured offline answers about enrollment, clearance, grades, the SPF, fees, and calendar events — no setup required.

## Demo accounts (seeded)

Staff passwords are **unique per account** and derived from the account email
(implemented in `backend/src/lib/passwords.js` → `demoPassword()`); every `npm run db:reset`
prints the full list, e.g.:

| Account | Role |
| --- | --- |
| `registrar@dorsu.edu.ph` | Registrar |
| `admin@dorsu.edu.ph` | Administrator (unique account; password is system-managed and cannot be changed via the portal) |
| `althea.soriano@dorsu.edu.ph` … `jessabel.escobar@dorsu.edu.ph` | Faculty (school emails derived from the seeded names) |

Run the seed to see the exact passwords:

```bash
cd backend && npm run db:seed
```

New staff accounts created in the admin panel get an auto-generated one-time password returned once in the UI and must change it on first login.

Students (`2025-0001` … `2025-0032`) are onboarded through the public flow: **Verify → Activate → Login** — their activation codes are returned by the verify screen.

## Testing

```bash
cd backend
npm test        # 20 integration tests: auth, enrollments, grades
```

## Docs

- `DEIS_Capstone_Proposal.md` — capstone proposal (Chapters 1–5) with implementation appendix
- `SPF.pdf` — the printed Student Profile Form the digital form is modeled after