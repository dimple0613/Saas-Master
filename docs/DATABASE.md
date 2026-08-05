# DATABASE.md - Database Schema Reference

## Overview

- ORM: **Prisma 7** (`prisma/schema.prisma`) with `@prisma/adapter-pg`.
- Database: PostgreSQL (local dev; Neon planned for production).
- Migrations: `prisma/migrations/` — latest: `20260805000000_oauth_roles_plans`.
- Seeding: `prisma/seed.ts` (creates `superadmin@example.com`, `admin@example.com`, `user@example.com`, `member@example.com` with password `password123`; seeds permissions/roles, plans, subscriptions, orgs, members, profile data, activity logs).

## Enums

```prisma
enum PlatformRole { superadmin admin user }
enum OrgRole { owner admin member }
enum UserStatus { active inactive suspended }
enum OrgStatus { active inactive suspended }
enum SubscriptionStatus { active trialing past_due canceled expired }
```

## Models

### `User` — table `users`

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK, autoincrement) | |
| `email` | String (unique) | |
| `password` | String? | bcrypt hash; **null for OAuth-only accounts** |
| `firstName` / `lastName` | String? | `first_name` / `last_name` (mapped from Auth.js `name`) |
| `orgName` | String? | `org_name` — display org string |
| `role` | `PlatformRole` (default `user`) | `superadmin` / `admin` / `user` |
| `status` | `UserStatus` (default `active`) | credentials + sessions blocked unless active |
| `emailVerified` | DateTime? | `email_verified` |
| `image` | String? | OAuth avatar |
| `resetToken` / `resetTokenExpiry` | String? / DateTime? | `reset_token` / `reset_token_expiry` |
| `emailNotifications` / `securityAlerts` / `marketingEmails` | Boolean? | `email_notifications` / `security_alerts` / `marketing_emails` |
| `createdAt` | DateTime | `created_at` |

Relations: `ownedOrgs`, `orgMemberships`, `invitedMembers`, `sentInvitations`, `createdData`, `activityLogs`, `accounts`, `sessions`, `activeSessions`, `userRoles`.

### `Organization` — table `organizations` (Tenant)

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `name` | String | |
| `description` | String? | |
| `logoUrl` | String? | `logo_url` |
| `ownerUserId` | Int | `owner_user_id` (FK → User, cascade) |
| `status` | `OrgStatus` (default `active`) | inactive/suspended orgs deny tenant permissions |
| `createdAt` | DateTime | `created_at` |

Relations: `owner`, `members`, `invitations`, `profileData`, `activityLogs`, `subscription` (one-to-one).

### `OrgMember` — table `org_members`

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `orgId` | Int | `org_id` (FK → Organization, cascade) |
| `userId` | Int | `user_id` (FK → User, cascade) |
| `role` | `OrgRole` (default `member`) | `owner` / `admin` / `member` |
| `invitedBy` | Int? | `invited_by` (FK → User, set null) |
| `createdAt` | DateTime | `created_at` |

Unique: `(@@unique([orgId, userId]))`.

### `Invitation` — table `invitations`

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `orgId` | Int | `org_id` (FK → Organization, cascade) |
| `email` | String | |
| `tokenHash` | String (unique) | `token_hash` — SHA-256 of the raw invite token |
| `role` | `OrgRole` (default `member`) | |
| `invitedBy` | Int | `invited_by` (FK → User, cascade) |
| `createdAt` | DateTime | `created_at` |
| `expiresAt` | DateTime | `expires_at` (24h) |
| `used` | Boolean (default false) | |

Unique: `(@@unique([orgId, email]))`. Pre-migration rows were backfilled to `'invalidated'`.

### `OrgProfileData` — table `org_profile_data`

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `orgId` | Int | `org_id` (FK → Organization, cascade) |
| `title` | String | |
| `content` | String? | |
| `createdBy` | Int? | `created_by` (FK → User, set null) |
| `createdAt` | DateTime | `created_at` |
| `updatedAt` | DateTime | `updated_at` |

### `ActivityLog` — table `activity_logs`

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `orgId` | Int? | `org_id` (FK → Organization, set null) |
| `userId` | Int | `user_id` (FK → User, cascade) |
| `action` | String | e.g. `data.create`, `member.invite`, `tenant.status_change` |
| `details` | String? | JSON string payload |
| `createdAt` | DateTime | `created_at` |

Indexes: `orgId`, `userId`, `createdAt`.

### Auth.js adapter models

- `Account` (`accounts`) — OAuth links (`provider` + `providerAccountId` unique), stores tokens.
- `Session` (`sessions`) — Auth.js database sessions (available for a future OAuth DB-session switch; currently JWT strategy is used).
- `VerificationToken` (`verification_tokens`) — email verification / magic links.

### `ActiveSession` — table `active_sessions` (custom session management)

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `userId` | Int | `user_id` (FK → User, cascade) |
| `tokenHash` | String (unique) | SHA-256 of the JWT `sid` |
| `userAgent` / `ipAddress` | String? | `user_agent` / `ip_address` |
| `createdAt` / `lastSeenAt` / `expiresAt` / `revokedAt` | DateTime? | session lifecycle |

### Permissions & roles

- `Permission` — `scope` ("system"/"tenant") + `key` + `label`; unique `(scope, key)`.
- `Role` — `scope` + `name` + `label` + `isDefault`; unique `(scope, name)`. Defaults: system `super_admin`/`admin`/`user`; tenant `owner`/`admin`/`member`.
- `RolePermission` — join `(role_id, permission_id)`.
- `UserRole` — optional extra roles granted to a user `(user_id, role_id)`.

### Plans & subscriptions

- `Plan` — `name`, `slug` (unique), `description`, `priceMonthly` (`DECIMAL(10,2)`), `currency`, `isActive`, timestamps.
- `PlanFeature` — `planId`, `key`, `label`, `value` (seeded: Free / Pro / Enterprise).
- `Subscription` — `orgId` (**unique** — one active plan per tenant), `planId`, `status` (`SubscriptionStatus`), `startsAt`, `endsAt`. Change plan via `PATCH /api/subscriptions`.

## Applying the Migration

```sh
# requires a running PostgreSQL at $DATABASE_URL
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

> Local PostgreSQL is currently not running (no server/docker); the migration SQL is ready and will apply cleanly once a database is available.
