# PROJECT.md - Project Overview

## Project Overview

EvalEtParking is a parking management and evaluation SaaS application. It provides tools for managing parking lots, tracking occupancy, handling reservations, and evaluating parking operations.

**Status: Pending Definition** - Specific features and scope are not yet defined.

## Project Goals

- Build a modern, scalable SaaS platform for parking management.
- Provide real-time parking lot monitoring and evaluation.
- Support multi-tenant organization-based access control.
- Deliver a clean, responsive user interface.

**Status: Pending Definition** - Detailed goals require further definition.

## Target Users

- Parking lot operators and managers
- Property management companies
- Municipal parking authorities
- End users (drivers) seeking parking information

**Status: Pending Definition** - User personas and detailed requirements pending.

## Core Features

- **Parking Lot Management** - Create, configure, and manage parking lots
- **Occupancy Tracking** - Real-time parking space availability
- **Reservations** - Allow users to reserve parking spaces
- **Evaluation and Reporting** - Analytics and performance metrics for parking operations

**Status: Pending Definition** - Feature priorities and detailed specifications pending.

## Functional Requirements

**Status: Pending Definition**

## SaaS Requirements

- Multi-tenant architecture with organization-based data isolation
- Role-based access control (Admin, Manager, Viewer)
- Subscription or usage-based billing model
- Two separate dashboard areas: System Admin and Tenant

## Application Structure

The application has two completely separate dashboard areas.

### 1. System Admin Dashboard

Route: `/admin/*`

The System Admin Dashboard provides system-level administration for platform operators.

**Features:**
- Admin login and logout
- Dashboard overview with system metrics
- System user management (list, view, edit, activate, deactivate, suspend)
- Tenant/organization management (list, view, create, edit, activate, deactivate, suspend)
- Tenant detail view (members, subscription, settings)
- Roles and permissions management
- Plans management and plan feature management
- Subscription overview across all tenants
- System settings
- Audit log viewer
- Admin profile and password management
- Active session management

**Authorization:** Only users with system-scoped roles (super_admin, admin) can access admin routes. Normal tenant users must never access admin routes.

### 2. Tenant Dashboard

Route: `/app/*`

The Tenant Dashboard provides tenant-level management for organization members.

**Features:**
- User login and logout
- Dashboard overview with tenant metrics
- Current tenant/organization context display
- Tenant profile and settings
- Organization members management
- Member invitation (invite, resend, revoke)
- Member management (edit role, activate, deactivate, remove)
- Tenant roles and permissions view
- User profile management (update profile, change password)
- Active session management
- Notification preferences
- Tenant switching for multi-tenant users

**Authorization:** Users must only access data belonging to the current tenant. Tenant data isolation must be enforced on the server side. Frontend route protection alone is not sufficient.

## Authentication Requirements

- Email and password authentication (primary)
- OAuth providers: **Google and Apple**
- Auth.js v5 as the authentication library
- JWT sessions for Credentials provider
- Database sessions for OAuth providers
- Forgot password flow with email reset links
- Email verification flow
- Session management (view, revoke individual, revoke all)
- Secure password storage with bcrypt
- Auth middleware for route protection
- Protected routes for `/admin/*` and `/app/*`

## Organization Requirements (Tenants)

In the application UI, organizations are referred to as "Tenants." The database uses `organizations` table — the UI terminology does not require database changes.

- Tenant creation and management
- Tenant-scoped data isolation
- Member invitation and role assignment
- Tenant status management (active, inactive, suspended)
- Tenant settings
- Tenant subscription and plan management
- Tenant switching for multi-tenant users
- A user may exist without belonging to any tenant
- A user may belong to multiple tenants

## Roles and Permissions

### System Scope

For the System Admin Dashboard. System-level roles.

Default roles:
- **Super Admin** - Full system access
- **Admin** - System administration

### Tenant Scope

For the Tenant Dashboard. Organization-level roles.

Default roles:
- **Owner** - Full organization access
- **Admin** - Organization administration
- **Member** - Basic organization access

Authorization is permission-based, not role-name-based. System permissions and tenant permissions are separated by scope.

## UI Requirements

- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Two separate dashboard layouts (Admin and Tenant)
- Responsive sidebar navigation
- Header with breadcrumbs and user menu
- Mobile navigation
- Loading, empty, and error states
- shadcn/ui components for all standard UI elements

## Security Requirements

- Data encrypted at rest and in transit
- Role-based access control
- Permission-based authorization
- Input validation on all user inputs
- SQL injection prevention (ORM-level)
- CSRF protection
- Server-side tenant data isolation
- Secure token hashing (SHA-256 for invitation tokens)
- Secure password storage (bcrypt)

## Testing Requirements

- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Authentication flow tests
- Authorization tests
- Tenant isolation tests

**Status: Pending Definition** - Testing framework and coverage targets pending.

## Deployment Requirements

- Local development with local PostgreSQL
- Production deployment on Vercel or similar platform
- Neon PostgreSQL for production database
- Environment-based configuration

**Status: Pending Definition** - Deployment pipeline and infrastructure pending.

## Decisions Required

- Specific parking management features and workflows
- Pricing model and subscription tiers
- OAuth provider selection (current choice: Google + Apple)
- Deployment platform selection
- CI/CD pipeline configuration
- Monitoring and logging strategy
- SMTP provider selection (dev fallback logs to console; templates in `lib/mail-templates.ts`)
- Payment processing integration

---

## Implementation Status (Current State)

> This section tracks how far the codebase matches the specification above.

### Legend

- ✅ **Done** — implemented and functional
- ⚠️ **Partial** — partially implemented
- ❌ **Missing** — not implemented / deviates from spec

### Application Structure

| Requirement | Status | Notes |
|---|---|---|
| System Admin route `/admin/*` | ✅ | `app/admin/` with its own layout + `AdminShell` |
| Tenant route `/app/*` | ✅ | `app/app/` with its own layout + `TenantShell` |
| Two separate dashboard layouts | ✅ | `AdminShell` vs `TenantShell` (shared `shell.tsx`) |
| Auth middleware route protection | ✅ | `proxy.ts` guards all non-auth routes |

### System Admin Dashboard

| Requirement | Status | Notes |
|---|---|---|
| Admin login and logout | ✅ | `(auth)/login`, signOut in user menu |
| Dashboard overview with system metrics | ✅ | `/admin` + stats/charts |
| System user management | ✅ | List/edit/role change + suspend/reactivate/delete (`/api/users/[id]`) |
| Tenant management | ⚠️ | List/create/edit/view + status API (`/api/orgs/[id]/status`); suspend UI on Accounts page missing |
| Tenant detail view (members, subscription, settings) | ⚠️ | Members + settings; subscription section missing |
| Roles and permissions management | ⚠️ | `Permission`/`Role`/`RolePermission`/`UserRole` models + seed; no management UI |
| Plans and plan feature management | ✅ | `Plan`/`PlanFeature` models + `POST /api/plans` + `/admin/plans` management page |
| Subscription overview across tenants | ✅ | `subscriptions` model + `GET/PATCH /api/subscriptions` + plan badges on Accounts page |
| System settings | ❌ | `/settings` is tenant-scoped only |
| Audit log viewer | ⚠️ | `/api/activity` + dashboard widgets; no full page |
| Admin profile and password | ✅ | `/admin/profile`, `/api/profile/password` |
| Active session management | ✅ | `ActiveSession` + `/api/sessions` + Profile → Sessions tab |
| Admin route authorization | ✅ | `proxy.ts` + `app/admin/layout.tsx` require `user.manage` |

### Tenant Dashboard

| Requirement | Status | Notes |
|---|---|---|
| User login and logout | ✅ | |
| Dashboard with tenant metrics | ✅ | `user/` page |
| Current tenant context display | ✅ | `lib/org-context.tsx`, `org-switcher` |
| Tenant profile and settings | ✅ | `settings/` page |
| Organization members management | ✅ | `members/` + `org-members` APIs |
| Member invitation (invite/resend/revoke) | ⚠️ | Invite done (SHA-256 tokens); resend/revoke missing |
| Member edit role / activate / deactivate / remove | ⚠️ | Edit role + remove; activate/deactivate missing |
| Tenant roles and permissions view | ❌ | Missing |
| User profile + change password | ✅ | `/app/profile` |
| Active session management | ✅ | Profile → Sessions tab |
| Notification preferences | ✅ | `/app/notifications` + `/api/profile/notifications` |
| Tenant switching | ✅ | `org-switcher` |
| Server-side tenant isolation | ✅ | Membership + permission checks in `orgs`, `members`, `invite`, `data` routes |

### Authentication

| Requirement | Status | Notes |
|---|---|---|
| Email + password | ✅ | Credentials provider |
| OAuth Google + Apple | ✅ | Providers configured in `lib/auth.ts` (registered when env vars set); buttons already in UI |
| Auth.js v5 | ✅ | `next-auth@5.0.0-beta.32` |
| JWT sessions (Credentials) | ✅ | `session.strategy = "jwt"` |
| Database sessions (OAuth) | ⚠️ | JWT strategy for all providers; Auth.js adapter models (`Account`/`Session`) exist |
| Forgot password / reset link | ✅ | `forgot-password/` + `reset-password/` |
| Email verification | ❌ | Not implemented |
| Session view/revoke | ✅ | `ActiveSession` + `/api/sessions` + Profile → Sessions tab |
| bcrypt password storage | ✅ | `bcryptjs` |
| Auth middleware | ✅ | `proxy.ts` (Node runtime) |

### Roles and Permissions

| Requirement | Status | Notes |
|---|---|---|
| System roles (Super Admin / Admin) | ✅ | `PlatformRole` = `superadmin`/`admin`/`user` + `roles` rows `super_admin`/`admin`/`user` |
| Tenant roles (Owner / Admin / Member) | ✅ | `OrgRole` = `owner`/`admin`/`member` + `roles` rows |
| Permission-based authorization | ✅ | `lib/permissions.ts` + guards in system & tenant API routes; middleware uses JWT permissions |
| System vs tenant scope separation | ✅ | `Permission.scope`, `Role.scope`, default roles seeded |

### Organizations / Tenants

| Requirement | Status | Notes |
|---|---|---|
| `organizations` table | ✅ | Prisma model + `org_members` + `invitations` |
| UI calls orgs "Tenants" | ⚠️ | UI currently uses "Organizations" |
| Tenant creation/management | ✅ | |
| Tenant-scoped isolation | ✅ | Server-side checks |
| Invite + role assignment | ✅ | |
| Tenant status (active/inactive/suspended) | ✅ | `OrgStatus` column + `PATCH /api/orgs/[id]/status` |
| Tenant settings | ✅ | |
| Tenant subscription/plan | ✅ | `Plan`/`PlanFeature`/`Subscription` models + APIs |
| User without tenant / multiple tenants | ✅ | |

### UI

| Requirement | Status |
|---|---|
| Responsive design | ✅ |
| Dark mode | ✅ `lib/theme-context.tsx`, `theme-selector` |
| Dashboard layouts | ✅ |
| Sidebar navigation | ✅ |
| Breadcrumbs + user menu | ✅ |
| Mobile navigation | ✅ |
| Loading/empty/error states | ✅ (data tables) |
| shadcn/ui | ✅ |

### Security

| Requirement | Status |
|---|---|
| RBAC | ✅ Permission-based (`lib/permissions.ts`) |
| Permission-based authorization | ✅ |
| Input validation | ⚠️ Basic checks in route handlers |
| SQL injection prevention | ✅ ORM (Prisma) |
| CSRF | ✅ Auth.js handled |
| Server-side tenant isolation | ✅ |
| SHA-256 invitation tokens | ✅ `hashToken()` in `lib/tokens.ts` |
| bcrypt | ✅ |

### Testing

| Requirement | Status |
|---|---|
| Unit tests | ❌ |
| Integration tests | ❌ |
| E2E tests | ❌ |
| Auth flow tests | ❌ |
| Authorization tests | ❌ |
| Tenant isolation tests | ❌ |

### Deployment

| Requirement | Status |
|---|---|
| Local PostgreSQL | ✅ `.env` + `prisma.config.ts` |
| Vercel / similar production | ❌ |
| Neon PostgreSQL production | ❌ |
| Environment-based config | ✅ `.env` |

### Parking Core Features

| Requirement | Status |
|---|---|
| Parking Lot Management | ❌ Pending Definition |
| Occupancy Tracking | ❌ Pending Definition |
| Reservations | ❌ Pending Definition |
| Evaluation and Reporting | ❌ Pending Definition |

## Known Deviations

1. **ORM:** PROJECT.md originally specified Drizzle; the codebase uses **Prisma** (decided at implementation time).
2. **OAuth sessions:** Spec calls for database sessions for OAuth; this build uses the **JWT strategy for all providers** (simplest correct setup for this stack), while the Auth.js adapter models exist for a future switch.
3. **Role naming:** `PlatformRole` uses `superadmin` (vs `super_admin`); the `roles` table uses `super_admin` to match the spec. System scope also keeps a `user` role (spec lists only Super Admin/Admin).
4. **Route structure:** Adopted the `/admin/*` and `/app/*` split with two layout shells (`AdminShell`/`TenantShell`). Tenant org pages live under `/app/organizations/*`; the system tenant/plan lists live under `/admin/accounts`. Legacy URLs (`/superadmin`, `/users`, `/user`, `/members`, `/settings`, `/organizations/*`, `/profile`) redirect via `next.config.ts` / `proxy.ts`.
5. **Invitation backfill:** Tokens issued before this migration were backfilled to `'invalidated'` (raw tokens can't be hashed retroactively); invites must be re-issued. To enable GitHub-style preview, this only requires applying the migration.
