# ROLES_AND_PERMISSIONS.md

## Current State

Authorization is **permission-based**. `lib/permissions.ts` resolves role→permission sets from the database (`Permission` / `Role` / `RolePermission` / `UserRole` tables, seeded by `seedPermissionsAndRoles()`). Route handlers call `hasSystemPermission` / `hasTenantPermission`; the middleware checks permission keys embedded in the JWT.

### Platform (System) scope

Enums: `PlatformRole` (`superadmin`, `admin`, `user`) on `User`. Roles table rows: `super_admin`, `admin`, `user`.

| PlatformRole | Role row | Permissions |
|---|---|---|
| `superadmin` | `super_admin` | All system permissions |
| `admin` | `admin` | `dashboard.view`, `user.manage`, `user.role_change`, `tenant.view`, `tenant.manage`, `subscription.view`, `subscription.manage`, `audit.view`, `log.view` |
| `user` | `user` | `dashboard.view` |

System permissions (`Permission` where `scope = "system"`):

`dashboard.view`, `user.manage`, `user.role_change`, `tenant.manage`, `tenant.view`, `plan.manage`, `subscription.view`, `subscription.manage`, `roles.manage`, `audit.view`, `languages.manage`, `system.settings`, `currency.manage`, `gateway.manage`, `credit.manage`, `template.manage`, `admin.manage`, `impersonate`, `log.view`

> PROJECT.md lists `super_admin` and `admin`. The enum uses `superadmin`; the `roles` table uses `super_admin`. Extra `user` role retained for non-admin platform users.

### Tenant scope

Enum: `OrgRole` (`owner`, `admin`, `member`) on `OrgMember`/`Invitation`. Roles table rows: `owner`, `admin`, `member`. Ownership is also modeled via `Organization.ownerUserId` (the owner always passes tenant permission checks).

| OrgRole | Permissions |
|---|---|
| `owner` | All tenant permissions |
| `admin` | `dashboard.view`, `member.view`, `member.invite`, `member.manage`, `org.settings`, `org.data`, `sessions.manage`, `profile.manage` |
| `member` | `dashboard.view`, `member.view`, `org.data`, `profile.manage` |

Tenant permissions (`Permission` where `scope = "tenant"`):

`dashboard.view`, `member.view`, `member.invite`, `member.manage`, `org.settings`, `org.data`, `profile.manage`, `sessions.manage`

### How authorization works

- **Middleware** (`proxy.ts`): `/admin/*` requires `user.manage` (from `session.user.permissions`, embedded in JWT at sign-in); superadmins are bounced off `/app/*`; legacy `/profile` redirects by role.
- **Landing redirect** (`app/page.tsx`): `/` → `/admin` for `superadmin`/`admin`, else `/app`.
- **Layout guards**: `app/admin/layout.tsx` re-checks `user.manage`; `app/app/layout.tsx` blocks superadmins.
- **Route handlers**: `hasSystemPermission(userId, key)` for system routes; `hasTenantPermission(userId, orgId, key)` for tenant routes (also rejects non-`active` orgs; owners pass). `getOrgMembership(orgId, userId)` returns the caller's tenant role.
- **Client**: sidebar nav filtered by role; permission-gated actions should mirror the server set (server is the source of truth).

## Gap summary

| Item | Status |
|---|---|
| System roles exist | ✅ (`superadmin`/`admin` enum + `super_admin`/`admin` roles) |
| Tenant roles exist | ✅ (`owner`/`admin`/`member`) |
| Permission model | ✅ `Permission`/`Role`/`RolePermission`/`UserRole` + seed |
| Permission-based checks | ✅ system + tenant API guards, JWT-based middleware |
| System vs tenant scope separation | ✅ `scope` column on `Permission`/`Role` |
| Roles & permissions management UI | ✅ `/admin/roles` (list, create, edit permissions, disable, delete) + `/api/roles`, `/api/roles/[id]`, `/api/permissions` |
| Admin accounts module | ✅ `/admin/admins` + `/api/admins`, `/api/admin-groups` (`admin.manage`); `User.kind` separates staff from customers |
| Impersonation / Login As | ✅ `/api/admin/impersonate` (`impersonate`, superadmin-only) — signed JWT + `ActiveSession` swap |
| Finance modules | ✅ Currencies / Payment Gateways / Credit Packages (`currency.manage` / `gateway.manage` / `credit.manage`) |
| Templates + Logs & Monitor | ✅ `/admin/templates` (`template.manage`); tracking / blacklist / notifications logs (`log.view`) |
| Extra `UserRole` assignment UI | ❌ Not present (model exists, used by `hasSystemPermission`) |

## Planned

- Tenant roles & permissions viewer for org admins.
- Client-side permission hook mirroring `session.user.permissions`.
