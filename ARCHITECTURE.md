# ARCHITECTURE.md

## Overview

EvalEtParking is a multi-tenant SaaS application built on **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **shadcn/ui**, **Prisma 7**, **PostgreSQL**, and **Auth.js v5 (next-auth)**. The parking domain features are **Pending Definition**; the current implementation is the multi-tenant SaaS shell (authentication, organizations/tenants, members, roles, dashboards, activity logging).

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js `16.2.10` (App Router) | Route handlers + Server Components |
| UI library | React `19.2.4` | Client components with `"use client"` |
| Styling | Tailwind CSS `4` | `@tailwindcss/postcss`, `tw-animate-css` |
| Components | shadcn/ui (`@base-ui/react`) | `components/ui/*` |
| Data access | Prisma `7` + `@prisma/adapter-pg` | PostgreSQL driver adapter |
| Database | PostgreSQL | Local dev; Neon planned for prod |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.32`) | JWT sessions; Credentials + Google + Apple |
| Password hashing | `bcryptjs` | Cost factor 10 |
| Tables/graphs | `@tanstack/react-table`, `recharts` | Data tables + dashboard charts |
| Notifications | `sonner` | Toast/toaster |
| Icons | `lucide-react` | |

## Directory Structure

```
app/
  (auth)/                 # Public auth pages (route group)
    login/ signup/ forgot-password/ reset-password/ invite/
  admin/                  # System Admin dashboard -> /admin/*
    layout.tsx            # Auth + user.manage permission + AdminShell
    page.tsx              # Platform dashboard (/admin)
    users/ accounts/ profile/
  app/                    # Tenant dashboard -> /app/*
    layout.tsx            # Auth + not-superadmin + TenantShell
    page.tsx              # Tenant dashboard (/app)
    members/ members/add/ organizations/[id]/
    settings/ notifications/ profile/
  api/
    auth/                 # next-auth handlers + signup/forgot/reset
    users/ orgs/ invite/ profile/ dashboard/ activity/ accounts/
  layout.tsx page.tsx     # Root; / redirects by role
components/
  ui/                     # shadcn/ui primitives
  tables/                 # DataTable + toolbar/pagination/columns
  dashboard/              # Stats, charts, recent activity, org dialogs
  common/                 # ConfirmDialog etc.
  shell.tsx               # Shared authenticated shell (sidebar+topnav, variant)
  admin-shell.tsx tenant-shell.tsx  # Thin wrappers around shell.tsx
  sidebar.tsx topnav.tsx org-switcher.tsx create-org-modal.tsx
  profile-page.tsx        # Shared profile/sessions component
hooks/  lib/  types/  prisma/  public/
```

## Runtime Modules

### 1. Database layer (`lib/prisma.ts`)

Singleton `PrismaClient` with `PrismaPg` adapter. Reused across route handlers to avoid connection exhaustion in dev. Schema lives in `prisma/schema.prisma`; migrations in `prisma/migrations/`.

### 2. Authentication (`lib/auth.ts`, `proxy.ts`, `lib/tokens.ts`)

- `lib/auth.ts` exports NextAuth handlers, `signIn`, `signOut`, and `auth()`.
- Configured with **JWT session strategy**, a **Credentials provider** (email + password verified via `bcrypt.compare`; rejects OAuth-only accounts and non-`active` users), and **Google/Apple OAuth providers** registered conditionally when their env vars are present. A `PrismaAdapter` (with a `createUser`/`updateUser` override mapping Auth.js `name` → `firstName`/`lastName`) persists OAuth accounts.
- The `jwt` callback tracks each sign-in as an `ActiveSession` row (sha-256 of `sid`), embeds system-scope permissions, and re-validates the session + user status on every request (throws on revoked/expired/suspended).
- `proxy.ts` is the auth middleware (**Node runtime**). It:
  - redirects unauthenticated users to `/login` (with `callbackUrl`)
  - redirects legacy `/profile` to `/admin/profile` or `/app/profile` based on JWT permissions
  - enforces the system-admin gate from the JWT: `/admin/*` requires `user.manage`; superadmins are bounced off `/app/*`
  - allows `/api/*` and auth pages through
- Session data: `user.id`, `user.role`, `user.permissions`, `user.sid` embedded in the JWT.
- `lib/tokens.ts` exports `hashToken()` (SHA-256) used for invite tokens and session ids.

### 3. Authorization (`lib/permissions.ts`)

- `Permission` keys are scoped (`system` / `tenant`); `Role` rows map to permissions via `RolePermission`.
- `hasSystemPermission(userId, key)` resolves the user's platform role + any extra `UserRole`s to a permission set.
- `hasTenantPermission(userId, orgId, key)` resolves the org role (`owner`/`admin`/`member`), and **rejects non-`active` orgs**; owners always pass.
- `app/page.tsx` redirects `/` → role landing; `app/admin/layout.tsx` checks the session + `user.manage` and renders `AdminShell`; `app/app/layout.tsx` checks the session (superadmins are bounced to `/admin`) and renders `TenantShell`. Both shells wrap `components/shell.tsx`, which renders the sidebar + topnav (variant-aware navigation, breadcrumbs, org switcher for tenants only).

> Authorization is **permission-based**. See `docs/ROLES_AND_PERMISSIONS.md`.

### 4. Multi-tenancy

Tenant = `Organization` (Prisma table `organizations`). Data isolation model:

- `OrgMember` join table (org ↔ user, with `role`), plus `ownerUserId` on `Organization` and `status` on `Organization`.
- `Invitation` for email invites (tokens stored as SHA-256); `OrgProfileData` for tenant-scoped records; `ActivityLog` scoped by `orgId`; `Subscription` (unique per org) linking a `Plan`.
- Tenant context on the client is managed by `lib/org-context.tsx` (a `React` context holding `orgId`/`orgName`), populated by `org-switcher`.
- **Server-side isolation:** route handlers re-derive membership/permissions from the DB (via `lib/permissions.ts`) and return 403 if the caller lacks access. Client-side context is never trusted for authorization.

### 5. API layer

App Router route handlers under `app/api/*` (JSON). All authenticated routes call `auth()` first, then enforce role/membership. See `docs/API_REFERENCE.md`.

### 6. Activity logging (`lib/activity.ts`)

`logActivity()` inserts into `activity_logs` with `action`, `details` (JSON string), optional `orgId`. Used for audit trails; surfaced via `app/api/activity` and dashboard "recent activity" widgets.

## Data Model (summary)

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Identity + platform role + status + notification prefs |
| `Organization` | `organizations` | Tenant (with status) |
| `OrgMember` | `org_members` | Tenant membership + org role (`owner`/`admin`/`member`) |
| `Invitation` | `invitations` | Member invites (email, SHA-256 `tokenHash`, role, expiry) |
| `OrgProfileData` | `org_profile_data` | Tenant-scoped records |
| `ActivityLog` | `activity_logs` | Audit trail |
| `Account` / `Session` / `VerificationToken` | `accounts` / `sessions` / `verification_tokens` | Auth.js adapter models (OAuth + future DB sessions) |
| `ActiveSession` | `active_sessions` | Custom session tracking/revocation |
| `Permission` / `Role` / `RolePermission` / `UserRole` | `permissions` / `roles` / `role_permissions` / `user_roles` | Permission-based RBAC |
| `Plan` / `PlanFeature` / `Subscription` | `plans` / `plan_features` / `subscriptions` | Billing/subscription |

Enums: `PlatformRole` (`superadmin`, `admin`, `user`), `OrgRole` (`owner`, `admin`, `member`), `UserStatus` (`active`, `inactive`, `suspended`), `OrgStatus` (`active`, `inactive`, `suspended`), `SubscriptionStatus`.

Full reference in `docs/DATABASE.md`.

## Security Model

- Passwords: bcrypt (`bcryptjs`), never stored in plaintext.
- Invitation tokens and session ids: random bytes via `crypto.randomBytes`, stored as **SHA-256** hashes (`lib/tokens.ts`).
- CSRF: handled by Auth.js for its own endpoints; route handlers require a session.
- SQL injection: prevented by Prisma parameterized queries.
- Tenant isolation: enforced server-side in route handlers via `lib/permissions.ts` (non-active orgs denied).

## Target Architecture (from PROJECT.md)

The specification calls for:

- Two **separate** dashboard areas: System Admin under `/admin/*`, Tenant under `/app/*` (**implemented** — separate `app/admin/` and `app/app/` route trees with `AdminShell` / `TenantShell`; legacy URLs redirect via `next.config.ts`).
- Permission-based authorization with separated system/tenant scopes (**implemented** via `lib/permissions.ts`).
- Subscription/plan/billing models and status fields for users and tenants (**implemented**).
- OAuth (Google + Apple) with database-backed sessions for OAuth users (OAuth implemented; DB sessions not — JWT strategy used).
- Session management (view/revoke) **implemented** (`ActiveSession` + `/api/sessions`); email verification **pending**.

See `docs/ROADMAP.md` for the plan to close remaining gaps.
