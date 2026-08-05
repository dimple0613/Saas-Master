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

---

## 14. Enable Google sign-in (OAuth)

The Google button is already in the login/signup UI — it only needs credentials.

1. Go to the **Google Cloud Console** → **APIs & Services** → **Credentials**: https://console.cloud.google.com/apis/credentials
2. Select (or create) a project. If prompted, **configure the OAuth consent screen** first (External, app name, your support email).
3. Click **Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins:** add `http://localhost:3000` (use your real domain in production).
6. **Authorized redirect URIs:** add `http://localhost:3000/api/auth/callback/google`.
7. Copy the **Client ID** and **Client secret** into `.env` and uncomment:
   ```env
   AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="your-client-secret"
   ```
8. Restart the dev server. The Google button now logs users in (new users are created automatically via the Prisma adapter).

> Production: replace `localhost` with your deployed origin, and re-check that the redirect URI in Google Console matches exactly.

---

## 15. Enable Apple sign-in (OAuth)

Apple requires a paid **Apple Developer Program** account ($99/year) and a live HTTPS URL — **Apple does not allow `localhost` or `http`**. For local testing, deploy to a temporary HTTPS domain first.

1. Go to https://developer.apple.com/account (Membership). Note your **Team ID** (Membership Details).
2. Create a **Service ID** (Identifiers → `+` → Service IDs) with **Sign in with Apple** enabled.
   - **Configure** the service and add your **redirect URI**: `https://your-domain.com/api/auth/callback/apple`.
   - The Service ID value becomes your `AUTH_APPLE_ID` (format like `com.example.app.signin`).
3. Create a **private key** (Keys → `+`, enable **Sign in with Apple**) and download the `.p8` file. Note the **Key ID**.
4. Generate the client secret. Auth.js provides a helper:
   ```bash
   npx auth add apple
   ```
   It will prompt for the Service ID, Team ID, Key ID, and the `.p8` key, then write `AUTH_APPLE_ID` and `AUTH_APPLE_SECRET` (a JWT) into your `.env`. If you already have a JWT, set it directly:
   ```env
   AUTH_APPLE_ID="com.example.app.signin"
   AUTH_APPLE_SECRET="eyJhbGciOi..."   # JWT client secret (generated by npx auth add apple)
   ```
5. Restart the server.

> Notes: Apple only returns the user's name/email the **first** time they consent. Each app can only use one Sign in with Apple configuration per environment.

---

## 16. Enable live email (SMTP)

By default (`SMTP_HOST` empty) emails are printed to the server console. To actually send them, set SMTP credentials in `.env`. Where to get them:

| Provider | How to get credentials |
|---|---|
| **Mailtrap** (testing) | Create an inbox → Integration shows `SMTP_HOST=smtp.mailtrap.io`, port `2525`, username/password |
| **Gmail** | Enable **2-Step Verification** → Google Account → Security → **App passwords** → create one for "Mail", use it as `SMTP_PASSWORD` |
| **SendGrid** | Sender Authentication → verify your domain → create an **API Key**; host `smtp.sendgrid.net`, port `587` |
| **Amazon SES** | Console → SMTP settings → generate SMTP credentials (host `email-smtp.<region>.amazonaws.com`, port `587`/`465`) |
| **Mailgun / Postmark** | SMTP settings page of the provider with username/password |

Then update `.env`:

```env
SMTP_HOST="smtp.mailtrap.io"        # your provider's SMTP server
SMTP_PORT="587"                     # 587 (STARTTLS) or 465 (SSL/TLS)
SMTP_USER="your-smtp-username"
SMTP_PASSWORD="your-smtp-password"
SMTP_SECURE="false"                 # true when SMTP_PORT is 465
MAIL_FROM="Acme Inc <no-reply@your-domain.com>"
APP_URL="http://localhost:3000"     # origin used in email links (set to your live URL in prod)
```

Restart the server. Password-reset links, member invites, welcome emails, and password-change confirmations are now sent for real.

---

## 17. Full `.env` reference

```env
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/saas_project?schema=public"

# Auth
NEXTAUTH_SECRET="change-me-to-a-long-random-string"   # npx auth secret generates one
NEXTAUTH_URL="http://localhost:3000"

# Branding / links (used in email templates)
APP_NAME="Acme Inc"
APP_URL="http://localhost:3000"

# Email (empty SMTP_HOST = emails logged to console, not sent)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_SECURE="false"
MAIL_FROM="Acme Inc <no-reply@example.com>"

# Google OAuth (optional) - see section 14
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Apple OAuth (optional) - see section 15
AUTH_APPLE_ID=""
AUTH_APPLE_SECRET=""
```
