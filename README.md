# KORA
A WhatsApp-powered school communication platform connecting parents with student results, fees, announcements, and school support.

## Stack

Nuxt 4 (Vue 3 + TypeScript + Nuxt UI + Tailwind) with Nitro as the REST backend, Prisma 7 + PostgreSQL, `nuxt-auth-utils` for sessions, Zod for validation.

## Getting started

1. Requires Node `^22.19.0` or `^24.11.0` (Nuxt 4.5's engine requirement).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string, and `NUXT_SESSION_PASSWORD` to a long random string.
3. Install dependencies: `npm install`
4. Run migrations: `npm run db:migrate`
5. Seed sample data: `npm run db:seed` — creates one admin/finance/academic/support user each (password `Password123!`), sample parents and students.
6. Start the dev server: `npm run dev`

## Scripts

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run typecheck` / `npm run lint`
- `npm run db:migrate` / `npm run db:generate` / `npm run db:seed` / `npm run db:studio`
- `npm run db:seed:test-students` — adds ~48 additional students across Grade 1–8 (with linked parents) for testing lists, search and pagination
- `npm run db:seed:test-activity` — adds test activity on top of the seeds: exams with results, Term 3 fee records and payments (paid / part-paid / pending / unpaid), announcements (published, drafts, archived) and parent conversations with messages. Safe to re-run; dates are relative to today
