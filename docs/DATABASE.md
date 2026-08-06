# DATABASE.md - Database Schema Reference

## Overview

- ORM: **Prisma 7** (`prisma/schema.prisma`) with `@prisma/adapter-pg`.
- Database: PostgreSQL (local dev; Neon planned for production).
- Migrations: `prisma/migrations/` — latest applied set includes admin groups, currencies, gateways, credit packages, email templates, tracking logs, and blacklist.
- Seeding: `prisma/seed.ts` (creates `superadmin@example.com`, `admin@example.com`, `user@example.com`, `member@example.com` with password `password123`; seeds permissions/roles, plans, subscriptions, orgs, members, profile data, activity logs, admin groups, currency, gateways, credit packages, email templates, tracking logs, blacklist).

## Enums

```prisma
enum PlatformRole { superadmin admin user }
enum UserKind { customer admin }
enum UserStatus { active inactive suspended }
enum OrgRole { owner admin member }
enum OrgStatus { active inactive suspended }
enum SubscriptionStatus { active trialing past_due canceled expired pending }
enum EmailTrackingStatus { sent opened clicked bounced }
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
| `kind` | `UserKind` (default `customer`) | `customer` / `admin` — separates tenant customers from staff accounts |
| `status` | `UserStatus` (default `active`) | credentials + sessions blocked unless active |
| `emailVerified` | DateTime? | `email_verified` |
| `image` | String? | OAuth avatar |
| `resetToken` / `resetTokenExpiry` | String? / DateTime? | `reset_token` / `reset_token_expiry` |
| `emailNotifications` / `securityAlerts` / `marketingEmails` | Boolean? | `email_notifications` / `security_alerts` / `marketing_emails` |
| `timezone` | String? (default `UTC`) | |
| `language` | String? (default `en`) | locale code, matches `languages.code` |
| `company` | String? | |
| `companyFirstName` / `companyLastName` / `companyEmail` | String? | `company_first_name` / `company_last_name` / `company_email` — company contact (editable in Profile) |
| `phone` | String? | |
| `address1` / `address2` | String? | |
| `city` / `state` / `zip` / `country` | String? | |
| `website` | String? | |
| `apiTokenHash` | String? | `api_token_hash` — SHA-256 hash of the live API token (generate/revoke via `/api/profile/api-token`) |
| `adminGroupId` | Int? | `admin_group_id` (FK → `AdminGroup`) — group for staff accounts |
| `createdAt` | DateTime | `created_at` |

Relations: `adminGroup`, `ownedOrgs`, `orgMemberships`, `invitedMembers`, `sentInvitations`, `createdData`, `activityLogs`, `accounts`, `sessions`, `activeSessions`, `userRoles`.

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
- `Role` — `scope` + `name` + `label` + `description` + `isDefault` + `isActive`; unique `(scope, name)`. Defaults: system `super_admin`/`admin`/`user`; tenant `owner`/`admin`/`member`.
- `RolePermission` — join `(role_id, permission_id)`.
- `UserRole` — optional extra roles granted to a user `(user_id, role_id)`.

### Plans & subscriptions

- `Plan` — `name`, `slug` (unique), `description`, `priceMonthly` (`DECIMAL(10,2)`), `currency`, `billingCycle` (`monthly`/`yearly`), `trialDays`, `requiresPayment`, `isActive`, timestamps.
- `PlanFeature` — `planId`, `key`, `label`, `value` (seeded: Free / Pro / Enterprise).
- `Subscription` — `orgId` (**unique** — one active plan per tenant), `planId`, `status` (`SubscriptionStatus`, incl. `pending`), `autoRenew` (default `true`), `credits` (int), `subscribers` (int), `startsAt`, `endsAt`. Managed via `GET/PATCH /api/subscriptions` and `PATCH /api/subscriptions/[id]` (`subscription.manage`).

### App settings & languages

- `AppSetting` — `key` (unique) + `value`; arbitrary key/value config, managed via `GET/PUT /api/settings` (`system.settings`).
- `Language` — `code` (unique), `name`, `region`, `isActive`; seeded with 18 common locales, managed via `/api/languages` (`languages.manage`). Active languages power the profile language picker.

### Admin modules (Finance, Admins, Templates, Logs & Monitor)

- `Currency` — `name`, `code` (unique), `symbol`, `exchangeRate`, `isDefault`, `isActive`; managed via `/api/currencies` (`currency.manage`).
- `PaymentGateway` — `name`, `slug` (unique), `type`, `config` (JSON object of API keys/credentials), `isActive`; managed via `/api/gateways` (`gateway.manage`).
- `CreditPackage` — `name`, `credits`, `price` (`DECIMAL(10,2)`), `currency`, `isVisible`, `isActive`; managed via `/api/credit-packages` (`credit.manage`).
- `AdminGroup` — `name` (unique), `description`, `isActive`; links to `User.adminGroupId`; managed via `/api/admin-groups` (`admin.manage`).
- `EmailTemplate` — `name`, `slug` (unique), `category`, `html`, `isActive`; managed via `/api/templates` (`template.manage`).
- `TrackingLog` — email send tracking: `userId`, `orgId`, `to`, `subject`, `status` (`EmailTrackingStatus`), `openedAt`, `clickedAt`, `sentAt`, timestamps; read via `/api/logs/tracking` (`log.view`).
- `Blacklist` — `emailOrDomain` (unique), `reason`, `createdAt`; managed via `/api/logs/blacklist` (`log.view`).

## Applying the Migration

```sh
# requires a running PostgreSQL at $DATABASE_URL
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

> Local PostgreSQL (`saas_project`) is set up — migrations applied and seed data loaded (superadmin/admin/user/member accounts, orgs, plans, activity logs).
