# ROADMAP.md

Planned work to bring the codebase in line with `PROJECT.md`. Ordered by dependency and impact. Items marked ✅ are complete.

## Phase 1 — Foundation & correctness (spec compliance)

- ✅ **1. OAuth: Google + Apple**
  - `Google`/`Apple` providers registered in `lib/auth.ts` (enabled via env vars), `PrismaAdapter` with `createUser`/`updateUser` name-mapping, `Account`/`Session`/`VerificationToken` models + migration.
  - Note: sessions use the **JWT strategy** for all providers (not DB sessions); adapter models are ready for a future switch.
- ✅ **2. SHA-256 invitation tokens** — `lib/tokens.ts` `hashToken()`; stored as `tokenHash`, hashed on lookup in `/api/invite/validate` and `/api/invite/accept`.
- ✅ **3. Role naming alignment** — tenant roles are now `owner`/`admin`/`member` (enum, roles table, seed, UI, APIs). System uses `superadmin` enum / `super_admin` roles table row.

## Phase 2 — Status management

- ✅ **4. User status** (`active`/`inactive`/`suspended`) — column, enforced in Credentials login + JWT session validation, suspend/reactivate in `users/` page via `PUT /api/users/[id]`.
- ✅ **5. Tenant status** (`active`/`inactive`/`suspended`) — column, `PATCH /api/orgs/[id]/status`, enforced in `hasTenantPermission`. Admin UI on Accounts page pending.

## Phase 3 — Permission-based authorization

- ✅ **6. Permission/Role models** — `Permission`, `Role`, `RolePermission`, `UserRole` + seed (`seedPermissionsAndRoles()`).
- ✅ **7. `hasPermission` helpers** — `hasSystemPermission` / `hasTenantPermission` / `getOrgMembership` in `lib/permissions.ts`; JWT embeds system permissions for middleware; route handlers migrated to permission checks.
- ❌ **8. Roles & permissions management UI** (system admin).
- ❌ **9. Tenant roles & permissions view** (tenant dashboard).

## Phase 4 — Plans, subscriptions & billing

- ✅ **10. Plan + plan-feature models** — seeded (Free/Pro/Enterprise); `GET/POST /api/plans`.
- ✅ **11. Subscription model** — org↔plan (unique per org); `GET/PATCH /api/subscriptions`; plan badges on Accounts page.
- ⚠️ **12. Tenant detail view: subscription section** — subscription data exposed via `/api/orgs/[id]`; dedicated billing UI pending.
- ❌ **13. Billing/payment integration** (decision required).

## Phase 5 — Sessions, email & audit

- ✅ **14. Session management** — `ActiveSession` model, `/api/sessions` (list/revoke), Profile → Sessions tab; JWT re-validates on every request.
- ❌ **15. Email verification flow** — `emailVerified` column exists; verify route/flow pending.
- ❌ **16. Email delivery** for forgot-password and invites (choose service — decision required).
- ⚠️ **17. Full audit log viewer page** — `/api/activity` + dashboard widgets exist; full page pending.

## Phase 6 — Route structure

- ✅ **18. Split dashboards** — System Admin under `/admin/*` (`app/admin/`), Tenant under `/app/*` (`app/app/`); updated `proxy.ts`, `sidebar.tsx`, `app/page.tsx`, `topnav`, `command-palette`, and all internal links; legacy URLs redirect via `next.config.ts`.
- ✅ **19. Two separate layout shells** — `AdminShell` / `TenantShell` (shared `shell.tsx`) with variant-aware sidebar/topnav; `app/admin/layout.tsx` requires `user.manage`, `app/app/layout.tsx` blocks superadmins.

## Phase 7 — Testing & CI/CD

- ❌ **20. Vitest + Testing Library**; unit + integration tests (see `docs/TESTING_STRATEGY.md`).
- ❌ **21. Playwright E2E** for critical flows (auth, invite, org switch).
- ❌ **22. GitHub Actions**: lint + test + e2e (see `docs/DEPLOYMENT.md`).

## Phase 8 — Production

- ❌ **23. Vercel deployment + Neon PostgreSQL.**
- ❌ **24. Monitoring/logging strategy.**
- ❌ **25. Parking domain features** (pending definition): lot management, occupancy, reservations, reporting.

## Immediate next steps

1. Apply migration + seed against a running PostgreSQL (`npx prisma migrate deploy && npx prisma db seed`), then boot `npm run dev` and verify OAuth + sessions end-to-end.
2. Add real Google/Apple OAuth credentials to `.env` (see `docs/AUTH_FLOW.md`).
3. Continue with Phase 3/4/5 UI items (roles/permissions + plans management, audit log page, tenant billing view).
