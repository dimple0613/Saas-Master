# DEPLOYMENT.md

## Current State

- Local development on PostgreSQL (`DATABASE_URL` in `.env`).
- `prisma.config.ts` configures the Prisma CLI (schema path + adapter seed).
- No production deployment, no CI/CD, no Neon setup.

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Auth.js signing secret |
| `NEXTAUTH_URL` | Base URL (e.g. `http://localhost:3000`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth (planned) |
| `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` (+ team/key options) | Apple OAuth (planned) |
| `APP_NAME` | Brand name used in email templates |
| `APP_URL` | Public origin used in email links (falls back to `NEXTAUTH_URL`) |
| `SMTP_HOST` | SMTP server host. Leave empty to log emails to the server console instead of sending (dev mode) |
| `SMTP_PORT` | SMTP port (default `587`) |
| `SMTP_USER` / `SMTP_PASSWORD` | SMTP auth credentials (optional for open relays) |
| `SMTP_SECURE` | Use TLS when connecting (`true`/`false`, default false unless port is 465) |
| `MAIL_FROM` | From address, e.g. `"Acme Inc <no-reply@example.com>"` |

## Local development

```bash
npm install
# ensure DATABASE_URL points at a local PostgreSQL
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Target: Production on Vercel + Neon

1. **Database:** Provision a Neon PostgreSQL project; set `DATABASE_URL` to the pooled connection string.
2. **Migrations:** run `npx prisma migrate deploy` against production (via a CI step or locally).
3. **Environment variables** in Vercel: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, OAuth credentials.
4. **Build:** `next build` (Vercel uses the framework preset automatically).
5. **Auth:** set `NEXTAUTH_URL` to the deployed origin; configure Google/Apple redirect URIs.

## Suggested CI/CD (GitHub Actions)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npx prisma generate

  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Pending decisions

- Deployment platform (Vercel assumed)
- Neon production database setup
- CI/CD pipeline
- Monitoring and logging strategy

## Email

Emails are sent via SMTP using `lib/mail.ts` (`nodemailer`). Templates live in `lib/mail-templates.ts`.

- **Dev mode:** if `SMTP_HOST` is empty, `sendMail()` logs the email to the server console instead of sending, so password-reset links and invite links remain usable locally.
- **Production:** set `SMTP_HOST` (+ `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `MAIL_FROM`) to a transactional provider (SES, SendGrid, Mailgun, Postmark, Mailtrap, Gmail SMTP...). Set `APP_URL` to the deployed origin.

Email types wired up:

| Type | Trigger | Template |
|---|---|---|
| Password reset | `POST /api/auth/forgot-password` | `forgotPasswordTemplate` |
| Invite member | `POST /api/orgs/:id/invite` | `inviteMemberTemplate` |
| Welcome | `POST /api/auth/signup` | `welcomeTemplate` |
| Password changed | `POST /api/auth/reset-password` | `passwordChangedTemplate` |
