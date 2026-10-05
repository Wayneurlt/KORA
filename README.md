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

## WhatsApp setup (SendPulse)

WhatsApp messages go through [SendPulse](https://sendpulse.com/features/chatbot/whatsapp)
(`server/utils/whatsapp.ts`). Without SendPulse keys the app runs in **test mode**: sends are
logged on the server and reported as sent, so every flow can be tried locally — use
**Settings → Try the parent bot** to chat as a parent.

To go live:

1. **Connect your WhatsApp number** to SendPulse as a WhatsApp chatbot.
2. **Turn off SendPulse's own automation for this bot** — the welcome flow, standard
   replies and any trigger flows. Kora answers parents itself (it needs live results and
   balances); if SendPulse flows stay on, parents get two replies.
3. **API keys**: SendPulse → Account settings → API. Put an API key (`sp_apikey_…`) in
   `SENDPULSE_API_KEY`, or the REST API ID and Secret in `SENDPULSE_CLIENT_ID` /
   `SENDPULSE_CLIENT_SECRET`. Put the bot's ID in `SENDPULSE_BOT_ID`.
4. **Webhook**: set `SENDPULSE_WEBHOOK_SECRET` to a long random string, deploy, then copy the
   webhook URL from **Settings → WhatsApp connection** (it includes the secret). In SendPulse
   go to the bot's **Bot settings → Webhooks**, paste it, and tick **Incoming message** and
   **Failed delivery**.
5. **Announcement template**: in SendPulse, create a WhatsApp template (category *Utility*)
   with two body variables, e.g.

   ```
   📢 *{{1}}*

   {{2}}

   Reply MENU for results, fees and more.
   ```

   Once Meta approves it, put its name in `WHATSAPP_ANNOUNCEMENT_TEMPLATE` (language code in
   `WHATSAPP_TEMPLATE_LANGUAGE`). WhatsApp only allows free-form messages within 24 hours of a
   parent's last message; the template is how announcements reach everyone else. Line breaks
   inside the message are flattened automatically (WhatsApp doesn't allow them in template
   variables).

Things to know:

- SendPulse doesn't report *delivered* or *read*, so announcements show **sent / failed /
  waiting**. Failures WhatsApp reports later (e.g. a number not on WhatsApp) move to failed and
  can be retried.
- Text messages are capped at 1,024 characters; longer bot replies are split automatically.
- Staff should reply from Kora's Conversations inbox, not SendPulse's, so the history stays in one place.
- Inbox replies outside the 24-hour window are blocked with an explanation.

## Deploying (Vercel)

The repo is ready for Vercel (`vercel.json` pins functions to Frankfurt, next to the Neon
database; `nuxt.config.ts` allows 60-second functions for announcement batches).

1. **Database first**: from your machine, apply migrations to the production database:
   `npm run db:deploy` (uses `DATABASE_URL` from `.env`). Do this before any deploy that
   includes a new migration. On a brand-new database also run `npm run db:seed` once, then
   change the seed passwords (or create real staff from the Staff page and deactivate the seed accounts).
2. **Import the GitHub repo** in Vercel (framework preset: Nuxt — detected automatically).
3. **Environment variables** (Project → Settings → Environment Variables, for Production and Preview):
   - `DATABASE_URL` — the Neon *pooled* connection string
   - `NUXT_SESSION_PASSWORD` — a new random value (`openssl rand -base64 48`), not your local one
   - `APP_URL` — e.g. `https://kora.vercel.app`
   - the `SENDPULSE_*` and `WHATSAPP_*` values once you have them
4. **Deploy**, then put the webhook URL from Settings into SendPulse (step 4 above).

Announcements are sent in batches the dashboard drives (`/api/announcements/:id/deliver`), so
large sends never hit a function time limit; if the page is closed mid-send, open the
announcement and choose **Continue sending**.

Vercel's free Hobby plan is for non-commercial use — fine for a pilot. Nothing is
Vercel-specific: `npm run build && node .output/server/index.mjs` runs anywhere Node does
(Render, Railway, a VPS).

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and a production build on every push.

## Security notes

- Every API route checks the signed-in user's role on the server (`server/utils/rbac.ts`);
  the dashboard hides what a role can't use, but the server is what enforces it.
- Sessions are re-checked against the database (cached 30s), so deactivating a staff member
  or changing their role takes effect on their next request.
- New staff and admin password resets get a one-time password that must be changed at first sign-in.
- The WhatsApp webhook only accepts requests carrying `SENDPULSE_WEBHOOK_SECRET` (SendPulse doesn't sign
  webhooks) and ignores events for other bots; without the secret it refuses all requests in production.
- Changes to payments, fees, students, parents, results, announcements, conversations and staff
  are written to the `AuditLog` table.

