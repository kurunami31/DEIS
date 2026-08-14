# DEIS Security & Improvements Audit

Status of every finding from the code review, with the fix each shipped. Last updated with the
Aug 2026 hardening pass. The production database and deployments were **not** touched by the
author — apply the runbook at the bottom to roll these out.

## Legend

- ✅ **Fixed** — implemented and covered by a regression test (or verified manually).
- 🔶 **Open** — not yet implemented; keep on the backlog.
- ⚪ **Consideration** — intentional trade-off; decide consciously.

---

## Security findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Activation code returned by `verify-student` to anyone who knows a student number (account takeover) | High | ✅ Fixed — hidden when `NODE_ENV=production` (`EXPOSE_ACTIVATION_CODES` env override); frontend shows a "contact Registrar" message. Codes now also expire (30 days) and are consumed on activation (single-use). Hash-at-rest is still open (needs a delivery channel) |
| 2 | Faculty can view any section's roster + grades (`GET /sections/:id/roster` had no ownership check) | High | ✅ Fixed — faculty are now restricted to their own sections (403) |
| 3 | Seat overselling race: seat check and insert were in separate transactions | High | ✅ Fixed — `POST /enrollments/submit` locks the section rows (`SELECT … FOR UPDATE`) and re-counts seats atomically |
| 4 | FINALIZED grades could be silently rewritten by faculty | High | ✅ Fixed — encoding is rejected after finalization (422); new `POST /grades/section/:id/reopen` (Registrar/Admin) returns records to DRAFT with an audit entry; finalize now requires every *approved* student to have a computed grade |
| 5 | Cross-program enrollment: API accepted any section in the term, not just the student's program | Medium | ✅ Fixed — new `CROSS_PROGRAM` evaluator rule (retakes exempt) |
| 6 | Logout cleared the cookie but left a stolen bearer token valid for up to 8 h | Medium | ✅ Fixed — logout bumps `tokenVersion`; note this is now single-session semantics (logging out signs out all devices) |
| 7 | `/api/chat` had no rate limit (Groq cost + latency abuse) | Medium | ✅ Fixed — per-IP `chatLimiter` (30/min) |
| 8 | SPF 2x2 photo could never exceed ~190 KB: schema allowed 1.5 MB but the global JSON body limit was 256 KB (confusing `BAD_JSON`) | Medium | ✅ Fixed — JSON body limit raised to 2 MB; frontend's "under 1 MB" promise now holds. Trade-off: all routes accept larger bodies (acceptable for a school portal; most are authenticated) |
| 9 | Payment is a self-service stub — a student could mark a request paid with no amount/reference | Medium | ✅ Fixed (validation) — `amount` + `reference` are now required (API + UI). 🔶 Open — there is still no real payment gateway or cashier verification; the stub only records the student's claim |
| 10 | Activation codes: static, 6-digit, stored as plaintext, never expire | Medium | ✅ Fixed (expiry + single-use) — `activationExpiresAt` column, expired codes rejected, code nulled on activation. 🔶 Hash-at-rest remains open: requires dropping the on-screen demo code display and adding an email/SMS delivery channel |
| 11 | Schedule-conflict check compares schedule strings exactly ("MW 07:00-10:00" vs "MW 08:00-11:00" is not flagged) | Medium | ✅ Fixed — schedule parser (`src/lib/schedule.js`) flags overlapping day/time blocks; adjacent blocks and different days are allowed; unparseable strings are treated conservatively |
| 12 | Login timing oracle: `verifyPassword` is skipped when the account doesn't exist (fast/slow response reveals valid identifiers) | Low | ✅ Fixed — login always runs a bcrypt compare (dummy hash for unknown accounts) |
| 13 | Security-question answers and TOTP recovery codes are salted/unsalted SHA-256 (brute-forceable if the DB leaks) | Low | ✅ Fixed — bcrypt for both; verification supports legacy rows so existing users keep working |
| 14 | CSV import returns activation codes in the API response (leak if logged) | Low | 🔶 Open — deliver via a one-time handover UI instead |
| 15 | `GET /students/:id` returns the full SPF (base64 photo, family background) to ADMISSION | Low | ✅ Fixed — ADMISSION receives the profile with photo/family/emergency/income/SCAS/contact fields redacted (Registrar/Admin unchanged) |
| 16 | Lockout counters and rate limits are in-memory — diluted by multiple function instances / IP rotation | Low | 🔶 Open — Redis-backed store for multi-node deployments (the code comments already note this) |
| 17 | Chat context (fullName, studentNo, GWA, clearance status) is sent to Groq, a third party | ⚪ | Consideration — disclose in the DPA notice; consider redacting to non-personal fields |
| 18 | Google OAuth skips DEIS TOTP (Google is treated as the second factor) and has no `hd` domain restriction | ⚪ | Consideration — accept, or keep TOTP required on the OAuth path and restrict to the school domain |
| 19 | Faculty can grade only sections they teach (already present) | — | ✅ Verified |
| 20 | Deactivated users' tokens stop working immediately (`isActive` checked per request) | — | ✅ Verified |

## Improvement backlog

- **Notifications**: email/SMS for activation codes, enrollment status changes, clearance sign-offs (nothing outbound today).
- **Print-ready outputs**: ✅ enrollment form and clearance certificate (COC) built as print-optimized pages (`/enrollments/:id/form`, `/clearance/print`). TOR still pending.
- **Faculty workflow**: grade-submission deadline enforcement and a registrar-approval reopen flow (ties into #4).
- **Clearance**: office-level export (who hasn't signed) and a per-student printable clearance.
- **Ops**: structured logging/error tracking, DB backups, `JWT_SECRET` rotation on deploy, documented `GROQ_API_KEY` privacy note.

## Runbook — rolling out the fixes

1. **Deploy the code** (backend + frontend) to Vercel. Verify `NODE_ENV=production` is set for the API
   (Vercel sets it by default) so the activation-code disclosure fix is active.
2. **Push the schema change** (new `activationExpiresAt` column on `StudentProfile`) to dev and prod:

   ```bash
   cd backend && npx prisma db push
   ```

   Existing rows get `activationExpiresAt = NULL`, which is treated as "never expires" — no student is
   locked out. New/CSV-registered students get a 30-day code; seeded demo students get a 1-year code.
3. **Backfill the clearance `ownerRole` data** (fixes office accounts seeing an empty Clearance Review).
   From your machine with the production Supabase URL:

   ```bash
   cd backend
   DATABASE_URL="postgresql://<your-supabase-url>" npm run db:backfill-clearance
   ```

   Or in the Supabase SQL editor (updates by code):

   ```sql
   UPDATE "ClearanceTemplate" SET "ownerRole" = 'ACCOUNTING' WHERE code = 'FIN';
   UPDATE "ClearanceTemplate" SET "ownerRole" = 'OSCD'      WHERE code = 'GUID';
   UPDATE "ClearanceTemplate" SET "ownerRole" = 'ADMISSION' WHERE code = 'ADM';
   UPDATE "ClearanceTemplate" SET "ownerRole" = 'OSA'       WHERE code = 'OSA';
   UPDATE "ClearanceTemplate" SET "ownerRole" = 'OHS'       WHERE code = 'HEALTH';
   UPDATE "ClearanceTemplate" SET "ownerRole" = 'CASHIERING' WHERE code = 'CASH';
   UPDATE "ClearanceTemplate" SET "ownerRole" = 'FAASG'     WHERE code = 'SFA';
   ```

   If the DB is missing the newer templates (ADM/OSA/HEALTH/CASH/SFA), the script creates them and
   backfills PENDING sign-offs on existing clearances — plain SQL won't.
4. **Demo impact**: after deploy, the verify page no longer displays activation codes (they come from
   the Registrar/email/SMS). If the team needs the demo to keep showing codes, set
   `EXPOSE_ACTIVATION_CODES=true` on the deployment.

## Next hardening steps (needs your sign-off)

- **Activation codes** (#10): add `activationExpiresAt` to `StudentProfile` (requires `prisma db push`
  on dev + prod), set a 30-day window at creation/seed, reject expired codes on activate, and null the
  code after successful activation (single-use). Hashing at rest only becomes possible once codes stop
  being displayed on-screen — pair it with an email/SMS delivery channel.
- **Real payment integration** (#9): wire a gateway or, minimally, a cashier "verify payment" step
  before approval.

## Notes

- The audit was performed on the codebase at `af5176f` + the hardening commits; all backend tests
  (53+) pass and the frontend builds.
- Production database and deployments were not modified by the audit author.
