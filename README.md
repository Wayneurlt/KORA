# KORA
A WhatsApp-powered school communication platform connecting parents with student results, fees, announcements, and school support.

## Stack

Nuxt 4 (Vue 3 + TypeScript + Nuxt UI + Tailwind) with Nitro as the REST backend, Prisma 7 + PostgreSQL, `nuxt-auth-utils` for sessions, Zod for validation.

## What it does

**Parents (WhatsApp)** message the school's number and get an automatic menu:
exam results, fee balance, latest announcements, their children, or "talk to the school".
A parent is matched by their registered WhatsApp number and verifies once by replying
with one of their children's admission numbers.

**Staff (dashboard)**, by role:

| Role | Can |
|---|---|
| Admin | Everything, including staff accounts and school settings |
| Finance | Record and confirm payments, bill fees; view students |
| Academic | Create exams, enter scores, publish results; view students |
| Support | Reply to parents in the shared WhatsApp inbox |

## Getting started

1. Requires Node `^22.19.0` or `^24.11.0` (Nuxt 4.5's engine requirement).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string, and `NUXT_SESSION_PASSWORD` to a long random string.
3. Install dependencies: `npm install`
4. Run migrations: `npm run db:migrate`
5. Seed sample data: `npm run db:seed` — creates one admin/finance/academic/support user each (password `Password123!`), sample parents and students.
6. Start the dev server: `npm run dev`

## Scripts

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run typecheck` / `npm run lint` / `npm test` (Vitest unit tests in `tests/`)
- `npm run db:migrate` / `npm run db:generate` / `npm run db:seed` / `npm run db:studio`
- `npm run db:seed:test-students` — adds ~48 additional students across Grade 1–8 (with linked parents) for testing lists, search and pagination
- `npm run db:seed:test-activity` — adds test activity on top of the seeds: exams with results, Term 3 fee records and payments (paid / part-paid / pending / unpaid), announcements (published, drafts, archived) and parent conversations with messages. Safe to re-run; dates are relative to today

## WhatsApp setup

Without credentials the app runs in **test mode**: sends are logged on the server and
reported as sent, so every flow can be tried locally — use **Settings → Try the parent bot**
to chat as a parent.

To go live you need a [Meta developer app](https://developers.facebook.com/apps) with the
WhatsApp product and a phone number:

1. In the app's **WhatsApp → API setup**, copy the **Phone number ID** into
   `WHATSAPP_PHONE_NUMBER_ID`, and create a **permanent access token** (System User in
   Business Settings, with `whatsapp_business_messaging`) for `WHATSAPP_ACCESS_TOKEN`.
2. Copy **App settings → Basic → App secret** into `WHATSAPP_APP_SECRET`.
3. Choose any string for `WHATSAPP_VERIFY_TOKEN`.
4. In **WhatsApp → Configuration → Webhook**, set the callback URL to
   `https://<your-domain>/api/whatsapp/webhook` (shown in Settings), enter the same verify
   token, then subscribe to the **messages** field. Meta needs a public HTTPS URL — for local
   testing use a tunnel such as `cloudflared` or `ngrok`.
5. For announcements, create a **Utility** message template with two body variables, e.g.

   ```
   📢 *{{1}}*

   {{2}}

   Reply MENU for results, fees and more.
   ```

   Once approved, put its name in `WHATSAPP_ANNOUNCEMENT_TEMPLATE` (and its language code in
   `WHATSAPP_TEMPLATE_LANGUAGE`). WhatsApp only allows free-form messages within 24 hours of
   a parent's last message; templates are how the school reaches everyone else.

Settings shows which of these are configured. Inbox replies outside the 24-hour window are
blocked with an explanation rather than silently failing.

## Deploying

The app is a standard Nuxt/Nitro Node server.

1. Provision PostgreSQL and set the environment variables from `.env.example`
   (`NUXT_SESSION_PASSWORD` must be a long random secret; `APP_URL` your public HTTPS URL).
2. Build: `npm ci && npm run build`
3. Apply migrations: `npx prisma migrate deploy`
4. First run only: `npm run db:seed` creates the school settings and the four starter staff
   accounts. **Change those passwords immediately** (or create real accounts from the Staff
   page and deactivate the seed ones).
5. Start: `node .output/server/index.mjs` (listens on `PORT`, default 3000) behind HTTPS —
   e.g. a reverse proxy, or any Node host (Render, Railway, Fly.io, a VPS with Caddy).
6. Point the Meta webhook at `https://<your-domain>/api/whatsapp/webhook`.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and a production build on every push.

## Security notes

- Every API route checks the signed-in user's role on the server (`server/utils/rbac.ts`);
  the dashboard hides what a role can't use, but the server is what enforces it.
- Sessions are re-checked against the database (cached 30s), so deactivating a staff member
  or changing their role takes effect on their next request.
- New staff and admin password resets get a one-time password that must be changed at first sign-in.
- The WhatsApp webhook verifies Meta's `X-Hub-Signature-256` HMAC; set `WHATSAPP_APP_SECRET` in production.
- Changes to payments, fees, students, parents, results, announcements, conversations and staff
  are written to the `AuditLog` table.

