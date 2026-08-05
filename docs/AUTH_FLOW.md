# AUTH_FLOW.md - Authentication & Authorization Flows

## Library

Auth.js v5 (`next-auth@5.0.0-beta.32`). Core wiring in `lib/auth.ts`, middleware in `proxy.ts`, auth pages under `app/(auth)/`.

## Current Providers

| Provider | Status |
|---|---|
| Credentials (email + password) | ✅ Active |
| Google | ✅ Registered in `lib/auth.ts` (enabled when `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are set) |
| Apple | ✅ Registered in `lib/auth.ts` (enabled when `AUTH_APPLE_ID`/`AUTH_APPLE_SECRET` are set) |

## Credentials Flow

1. User submits email/password on `/login` (or `/signup`).
2. `Credentials.authorize()` looks up the user by email and verifies with `bcrypt.compare`.
3. Returns `null` if the user doesn't exist, has no password (OAuth-only account), or `status !== "active"` (suspended/inactive).
4. Session strategy is **JWT** — on sign-in the `jwt` callback stamps `token.role`, `token.id`, `token.sid`, and `token.permissions` (system-scope permission keys loaded from the `roles`/`permissions` tables).
5. The `session` callback copies these onto `session.user`.
6. `proxy.ts` (auth middleware, **Node runtime**) guards pages; unauthenticated users are redirected to `/login?callbackUrl=...`.

### OAuth Flow (Google / Apple)

1. User clicks the Google/Apple button → `signIn("google")` / `signIn("apple")`.
2. `PrismaAdapter` links the OAuth identity: creates the user (mapping Auth.js `name` → `firstName`/`lastName`) and an `Account` row (`provider` + `providerAccountId`).
3. On success the JWT callback creates an `ActiveSession` and embeds permissions.
4. If the provider env vars are unset, the provider is simply not registered (the button returns an "unconfigured" error until credentials are added).

### Sign-up flow (`/api/auth/signup`)

- Creates a user with bcrypt-hashed password (default role `user`, `status: active`), then signs them in.

### Forgot / reset password

- `/forgot-password` posts to `/api/auth/forgot-password` → generates `resetToken` (random bytes) + expiry, (email delivery is **not wired** — returns the reset link directly).
- `/reset-password?token=...` posts to `/api/auth/reset-password` → validates token/expiry, updates the bcrypt hash.

### Invite flow

- Org owner/admin creates an invite (`POST /api/orgs/[id]/invite`, requires `member.invite` permission) → random 32-byte token, **stored as SHA-256 (`tokenHash`)** (24h expiry).
- Recipient visits `/invite?token=...` → logs in/creates account → `POST /api/invite/accept` hashes the incoming token, looks up `tokenHash`, verifies email match, and creates the `OrgMember`.

## Session Management

- Every sign-in creates an `ActiveSession` row keyed by `sha256(sid)` (30-day expiry, tracks `userAgent`/`ipAddress`/`lastSeenAt`).
- The JWT carries `sid`; on every request the `jwt` callback re-validates the session: revoked, expired, or a non-`active` user status throws and signs the user out.
- Users manage sessions in Profile → Sessions tab (`GET/DELETE /api/sessions`). Revoking the current session logs that device out.

## Middleware Route Guard (`proxy.ts`)

| Path | Rule |
|---|---|
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/invite` | Public |
| `/api/*` | Pass-through (handlers self-check) |
| `/admin/*` | Requires `user.manage` permission (from JWT) |
| `/app/*` | Authenticated (superadmins bounced to `/admin`) |
| `/profile` (legacy) | Redirects to `/admin/profile` or `/app/profile` by role |
| everything else | authenticated |

> Authorization is **permission-based**: middleware checks `session.user.permissions`, API routes call `hasSystemPermission` / `hasTenantPermission` in `lib/permissions.ts`. See `docs/ROLES_AND_PERMISSIONS.md`.

## Security Notes

- Passwords: bcrypt (`bcryptjs`).
- Reset tokens: random 32-byte hex.
- Invitation tokens: random 32-byte hex, stored as `sha256(token)` (`lib/tokens.ts`).
- Session ids: random 64-byte hex, stored as `sha256(sid)`.

## Planned

- **Email verification:** `emailVerified` exists on `User`; verification flow (token + link + handler) not yet wired.
- **Revoke-all sessions:** API supports individual revoke; revoke-all can be added to `DELETE /api/sessions`.
