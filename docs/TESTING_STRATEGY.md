# TESTING_STRATEGY.md

## Current State

**No tests exist.** No test framework, no test scripts, no CI. The only verification is `npm run lint` (eslint).

## Target (per PROJECT.md)

- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Authentication flow tests
- Authorization tests
- Tenant isolation tests

**Status: Pending Definition** — framework and coverage targets pending.

## Proposed Stack

| Layer | Tool | Purpose |
|---|---|---|
| Test runner | Vitest | Unit + integration |
| Component/DOM | @testing-library/react | Client component tests |
| E2E | Playwright | Critical user flows |
| Coverage | Vitest `v8` coverage | Coverage reports |

## Suggested scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:coverage": "vitest run --coverage"
}
```

## Test plan map

### Unit tests

- `lib/auth.ts` — JWT/session callbacks (role/id stamping).
- Password hashing helpers (bcrypt round-trip).
- `lib/activity.ts` — `logActivity` writes correct rows; failure is swallowed.
- Role/permission helper (`hasPermission`) once permission model lands.
- Invitation token hashing helper (SHA-256) once implemented.
- Seed idempotency.

### Integration tests (API)

- `app/api/auth/signup|forgot-password|reset-password` — validation, token expiry, bcrypt hash.
- `app/api/users` + `/users/[id]` — superadmin-only, self-protection, invalid role rejection.
- `app/api/orgs` — create org, ownership rules.
- `app/api/orgs/[id]` + `/members/[mid]` — membership/owner/admin gates (403 for non-members).
- `app/api/invite/validate|accept` — expired/used tokens, email mismatch, duplicate membership.
- `app/api/profile/*` — password change requires current password.
- `app/api/activity` — org scoping (member sees own org only; superadmin sees all).

### Authorization tests

- Non-superadmin denied on `/api/users`, `/api/accounts`.
- Non-member denied on `/api/orgs/[id]/*`.
- Normal user redirected from `/admin/*` by `proxy.ts` (no `user.manage`).
- superadmin blocked from `/app/*`; legacy `/superadmin`, `/users`, `/organizations` redirect to `/admin/*` / `/app/*`.

### Tenant isolation tests (critical)

- User A cannot read/modify org owned by User B even with a crafted `orgId`.
- Data endpoints scoped by `orgId` return only that tenant's records.
- Accept invite to one tenant does not grant access to another tenant's data.

### E2E (Playwright)

- Signup → login → create org → invite member → accept invite → switch org.
- Forgot/reset password flow.
- superadmin user management (change role, delete).
- Dark mode toggle + responsive nav smoke test.

## CI note

Wire `lint` + `test` + `test:e2e` into a GitHub Actions workflow (see `docs/DEPLOYMENT.md`).
