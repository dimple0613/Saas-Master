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
- ✅ **8. Roles & permissions management UI** (system admin) — `/admin/roles` with create/edit/disable/delete; `/api/roles`, `/api/roles/[id]`, `/api/permissions`; permission checkboxes grouped by scope.
- ❌ **9. Tenant roles & permissions view** (tenant dashboard).

## Phase 4 — Plans, subscriptions & billing

- ✅ **10. Plan + plan-feature models** — seeded (Free/Pro/Enterprise); full CRUD via `GET/POST /api/plans` + `PUT/DELETE /api/plans/[id]`; plans page supports edit, activate/deactivate, delete (blocked while in use); billing cycle, trial days and `requiresPayment` added.
- ✅ **11. Subscription model** — org↔plan (unique per org); `GET/PATCH /api/subscriptions`; plan badges on Accounts page; change-plan control on Plans page.
- ⚠️ **12. Tenant detail view: subscription section** — subscription data exposed via `/api/orgs/[id]`; dedicated billing UI pending.
- ❌ **13. Billing/payment integration** (decision required).

## Phase 4b — Admin modules (Phases 1–3 scope)

- ✅ **Dashboard extension** — superadmin dashboard now shows Plans & Subscriptions cards (total/active plans, active subscribers, MRR), a plan-distribution panel (`SubscriptionStats`), Recent Subscriptions, Top Customers, and a Customer Growth area chart — backed by the extended `/api/dashboard`.
- ✅ **Profile extensions** — `/api/profile` GET/PUT returns/updates timezone, language, company + company contact, photo URL, phone, address, city, state, zip, country, website; profile UI gained an editable "Company & Address" section, a photo field, and a language picker sourced from active DB languages.
- ✅ **Settings (system)** — `/admin/settings` with a Languages tab (add/edit/toggle/delete via `/api/languages` + `/api/languages/[id]`, gated by `languages.manage`) and a System Settings tab (key/value editor via `/api/settings`, gated by `system.settings`).

## Phase 4c — Admin modules (billing, customers, admins, templates, logs & monitor)

- ✅ **Finance** — Currencies, Payment Gateways (JSON config for keys/credentials), and Credit Packages modules with full CRUD (`/api/currencies`, `/api/gateways`, `/api/credit-packages` + `[id]`), gated by `currency.manage` / `gateway.manage` / `credit.manage`. Legacy/PHP-only fields (gateway credentials) are stored as `PaymentGateway.config`.
- ✅ **Subscriptions management** — `/admin/subscriptions` with MRR/Active/Auto-renewing/Ending-soon cards, status tabs, plan/recurring/search filters, and per-subscription actions (disable recurring, terminate) via `PATCH /api/subscriptions/[id]` (`subscription.manage`).
- ✅ **Admins module** — `User.kind` (`customer`/`admin`) split; `/admin/admins` with staff accounts + admin groups CRUD (`/api/admins`, `/api/admin-groups`), gated by `admin.manage`. Soft-delete converts an admin to an inactive customer.
- ✅ **One-Click Login / Login As** — `/api/admin/impersonate` (superadmin-only, `impersonate` permission) creates an `ActiveSession` + signed Auth.js JWT and swaps the session cookie; redirects to `/admin` for admins, `/app` for customers.
- ✅ **Customers module** — `/admin/customers` with Total/Active/Subscribed/Inactive cards, search + status tabs, login-as, edit (incl. password/timezone/language/company), enable/disable/delete (`/api/customers` + `[id]`).
- ✅ **Templates module** — `/admin/templates` with CRUD for email templates (`/api/templates` + `[id]`, `template.manage`).
- ✅ **Logs & Monitor** — `/admin/logs/tracking` (email tracking with status counts), `/admin/logs/blacklist` (block emails/domains), `/admin/logs/notifications`, and `/admin/logs/api-docs` (endpoint reference) — all gated by `log.view`.
- ✅ **API tokens** — `GET/POST/DELETE /api/profile/api-token`; token returned once, stored as SHA-256 hash (`User.apiTokenHash`).
- ✅ **Navigation restructure** — sidebar, breadcrumb, and command palette regrouped into Dashboard / Customers / Billing / Management / Finance / Platform / Logs & Monitor / Account.

## Phase 5 — Sessions, email & audit

- ✅ **14. Session management** — `ActiveSession` model, `/api/sessions` (list/revoke), Profile → Sessions tab; JWT re-validates on every request.
- ❌ **15. Email verification flow** — `emailVerified` column exists; verify route/flow pending.
- ❌ **16. Email delivery** for forgot-password and invites (choose service — decision required).
- ⚠️ **17. Full audit log viewer page** — `/api/activity` + dashboard widgets exist; Logs & Monitor now covers email tracking, blacklist, and notification logs; a general activity-log page is still pending.

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
3. Continue with remaining tenant-side items (tenant roles & permissions view, tenant billing/subscription view) and Phase 5–8 items (email verification, general audit log page, tests, deployment).
