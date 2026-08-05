# Saas-Master

A production-style **multi-tenant SaaS starter** built with **Next.js 16 (App Router)**, **TypeScript**, **Prisma**, **PostgreSQL**, and **Auth.js (NextAuth v5)**.

It ships with two dashboard areas:

| Area | Route | Who sees it |
|---|---|---|
| **Platform admin** | `/admin/*` | Super admins & platform admins |
| **Tenant dashboard** | `/app/*` | Regular users / org members |

Plus complete auth flows: signup, login, forgot/reset password (with email), member invitations, and email templates.

---

## 1. Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Auth.js (NextAuth v5) — JWT strategy, Credentials + OAuth (Google/Apple, optional)
- **UI:** Tailwind CSS v4 + shadcn/ui components
- **Email:** Nodemailer (SMTP) with HTML templates
- **Charts:** Recharts

---

## 2. Prerequisites

Install these **before** starting:

1. **Node.js 20+** (LTS recommended)
   - Download from https://nodejs.org
   - Verify: `node -v`
2. **PostgreSQL 14+**
   - Option A — Install directly: https://www.postgresql.org/download/
   - Option B — Use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=saas_project postgres:16`
   - Option C — Use a free cloud Postgres (e.g. Neon): https://neon.tech
   - Verify: `psql --version`
3. **Git** (to clone and push code)
   - Verify: `git --version`

> **Windows tip:** Install Postgres with the default settings. Remember the password you set — you'll put it in `.env` in step 5.

---

## 3. Get the code

```bash
git clone https://github.com/dimple0613/Saas-Master.git
cd Saas-Master
```

---

## 4. Install dependencies

```bash
npm install
```

---

## 5. Configure environment variables

Create a `.env` file in the project root. There is no committed `.env` (it contains secrets), so create it by copying the example:

```bash
cp .env.example .env
```

If there is no `.env.example`, create `.env` with these values:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/saas_project?schema=public"
NEXTAUTH_SECRET="change-me-to-a-long-random-string"
NEXTAUTH_URL="http://localhost:3000"

APP_NAME="Acme Inc"
APP_URL="http://localhost:3000"

# Email (optional in dev — if empty, emails are logged to the server console instead of sent)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_SECURE="false"
MAIL_FROM="Acme Inc <no-reply@example.com>"
```

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string. Replace `YOUR_PASSWORD` with the password you chose during Postgres setup |
| `NEXTAUTH_SECRET` | Auth.js signing secret. Use a long random string |
| `NEXTAUTH_URL` | The app URL (`http://localhost:3000` in dev) |
| `APP_NAME` / `APP_URL` | Used in email templates and links |
| `SMTP_*` / `MAIL_FROM` | SMTP credentials. **Leave `SMTP_HOST` empty in dev** — emails get printed to the terminal instead of sent |

> Optional OAuth — add these if you want Google/Apple login:
> ```env
> AUTH_GOOGLE_ID="..."
> AUTH_GOOGLE_SECRET="..."
> AUTH_APPLE_ID="..."
> AUTH_APPLE_SECRET="..."
> ```

---

## 6. Set up the database

These commands create the tables and fill them with demo data:

```bash
# 1. Create the schema in your database
npx prisma migrate dev

# 2. Generate the Prisma client
npx prisma generate

# 3. Seed demo data (users, orgs, plans, activity...)
npx prisma db seed
```

> If `npx prisma migrate dev` fails with a connection error, double-check that PostgreSQL is running and that `DATABASE_URL` in `.env` matches your local Postgres credentials.

---

## 7. Run the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

> The seed data creates several organizations. When you log in as a normal user, use the org switcher in the top bar to change between tenants.

---

## 8. Demo accounts

After seeding, log in with any of these (password is `password123` for all):

| Email | Role | What you can do |
|---|---|---|
| `superadmin@example.com` | superadmin | Full `/admin/*` platform management |
| `admin@example.com` | admin | `/admin/*` platform management |
| `user@example.com` | user | `/app/*` tenant dashboard |
| `member@example.com` | user | `/app/*` tenant dashboard |

---

## 9. Email (dev mode)

Emails are wired up for:

- Password reset (`/forgot-password`)
- Member invitation (invite a member from `/app`)
- Welcome email (on signup)
- Password changed confirmation

**Without SMTP configured**, `sendMail()` logs the full email to your terminal instead of sending, so you can still test the reset/invite flows by copying the link from the console.

To actually send emails, set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, etc. in `.env` using any SMTP provider (Gmail app password, Mailtrap, SendGrid, SES...). Templates live in `lib/mail-templates.ts`.

---

## 10. Available commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check the project |
| `npx prisma migrate dev` | Create/apply database migrations |
| `npx prisma db seed` | Insert demo data |
| `npx prisma studio` | Open a browser UI to browse/edit the database |

---

## 11. Project structure

```
app/
  (auth)/          # login, signup, forgot-password, reset-password, invite pages
  admin/           # platform admin area (/admin/*)
  app/             # tenant dashboard area (/app/*)
  api/             # all API route handlers
components/        # shared UI components (shadcn/ui + feature components)
lib/               # auth, mail, permissions, prisma client, tokens
prisma/            # schema, migrations, seed
docs/              # architecture, API reference, auth flow, roles docs
proxy.ts           # middleware (route protection)
```

---

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| `Error: P1001 Can't reach database server` | PostgreSQL isn't running or `DATABASE_URL` is wrong. Start Postgres and check `.env` |
| `Can't reach database at localhost:5432` | Confirm the port matches your Postgres install (default `5432`) |
| Port 3000 already in use | `npm run dev -- -p 3001` |
| Password reset/invite email not arriving | It's printed in the terminal when `SMTP_HOST` is empty. Configure SMTP to actually send |
| `node -v` < 20 | Install Node.js 20+ and re-run `npm install` |

---

## 13. Learn more

- [Next.js docs](https://nextjs.org/docs)
- [Prisma docs](https://www.prisma.io/docs)
- [Auth.js docs](https://authjs.dev)
- See `docs/` in this repo for architecture, API reference, auth flow, roles & permissions, and roadmap.
