# API_REFERENCE.md

All endpoints are App Router route handlers under `app/api/`. Responses are JSON. Authenticated handlers call `auth()` from `lib/auth.ts` and return `401` when unauthenticated, `403` when the caller lacks the required permission/membership.

Authorization uses `hasSystemPermission(userId, key)` and `hasTenantPermission(userId, orgId, key)` from `lib/permissions.ts`. System permissions: `dashboard.view`, `user.manage`, `user.role_change`, `tenant.manage`, `tenant.view`, `plan.manage`, `subscription.view`, `roles.manage`, `audit.view`, `system.settings`. Tenant permissions: `dashboard.view`, `member.view`, `member.invite`, `member.manage`, `org.settings`, `org.data`, `profile.manage`, `sessions.manage`.

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| ALL | `/api/auth/[...nextauth]` | — | NextAuth handlers (signin, callback, session, signout) |
| POST | `/api/auth/signup` | — | Create user (bcrypt) + sign in |
| POST | `/api/auth/forgot-password` | — | Issue reset token + expiry |
| POST | `/api/auth/reset-password` | — | Validate token, update password |

## Users (System Admin)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | `user.manage` | List users. Query: `limit`, `offset`, `sortBy` (`name`/`organization`/`role`/`joined`), `sortOrder`, `search`. Includes `status` |
| PUT | `/api/users/[id]` | `user.role_change` / `user.manage` | Change role and/or status (cannot change self). Body: `{ role?, status? }` |
| DELETE | `/api/users/[id]` | `user.manage` | Delete user (cannot delete self) |

## Organizations / Tenants

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/orgs` | Any user | List `owned` + `memberOf` orgs |
| POST | `/api/orgs` | Any non-superadmin | Create org. Body: `{ name, description? }` |
| GET | `/api/orgs/all-with-members` | superadmin | All orgs with member counts |
| GET | `/api/orgs/[id]` | Org member/owner | Org detail + members + `myRole` |
| PUT | `/api/orgs/[id]` | `org.settings` | Update name/description |
| PATCH | `/api/orgs/[id]/status` | `tenant.manage` | Set org status: `{ status }` (`active`/`inactive`/`suspended`) |
| GET | `/api/orgs/[id]/data` | Org member | Paginated tenant data (sort/search) |
| POST | `/api/orgs/[id]/data` | `org.data` | Create tenant data record |
| PUT | `/api/orgs/[id]/data/[did]` | `org.data` | Update tenant data record |
| DELETE | `/api/orgs/[id]/data/[did]` | `org.data` | Delete tenant data record |
| POST | `/api/orgs/[id]/invite` | `member.invite` | Create invitation. Body: `{ email, role }` (role ∈ owner/admin/member) → returns token + link |
| PUT | `/api/orgs/[id]/members/[mid]` | `member.manage` | Update member role |
| DELETE | `/api/orgs/[id]/members/[mid]` | `member.manage` | Remove member (cannot remove owner) |

## Invitations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/invite/validate` | — | Validate invite token (hashed with SHA-256 before lookup) |
| POST | `/api/invite/accept` | Authenticated | Accept invite (email must match session) → creates `OrgMember` |

## Profile & Sessions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/profile` | Any user | Current profile |
| PUT | `/api/profile` | Any user | Update `first_name` / `last_name` |
| PUT | `/api/profile/password` | Any user | Change password (verifies current) |
| GET | `/api/profile/notifications` | Any user | Notification preferences |
| PUT | `/api/profile/notifications` | Any user | Update notification preferences |
| GET | `/api/sessions` | Any user | List own active + recently revoked sessions |
| DELETE | `/api/sessions` | Any user | Revoke own session. Body: `{ id }` |

## Dashboard & Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard` | Any user | Role-scoped dashboard metrics |
| GET | `/api/activity` | Any user | Audit/activity logs. superadmin sees all orgs; others see their orgs |

## Plans & Subscriptions (System Admin)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/plans` | Any user | List active plans with features |
| POST | `/api/plans` | `plan.manage` | Create a plan. Body: `{ name, slug, description?, priceMonthly?, currency?, features? }` |
| GET | `/api/subscriptions` | `subscription.view` | All subscriptions with org + plan |
| PATCH | `/api/subscriptions` | `plan.manage` | Change org plan. Body: `{ orgId, planId }` |

## Accounts (System Admin)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/accounts` | `subscription.view` | All organizations with owner, member count, status, and subscription/plan |

## Authorization Notes

- Membership + permissions are re-derived from the DB on every request — never trusted from client state.
- System checks go through `hasSystemPermission`; tenant checks through `hasTenantPermission` (which also rejects non-`active` orgs).
- Invitation tokens and session ids are stored as SHA-256 hashes (`lib/tokens.ts`).
