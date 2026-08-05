import { prisma } from "./prisma";

export type Scope = "system" | "tenant";

// System-scope permissions (System Admin dashboard)
export const SYSTEM_PERMISSIONS = [
  { key: "dashboard.view", label: "View system dashboard" },
  { key: "user.manage", label: "Manage system users" },
  { key: "user.role_change", label: "Change user roles" },
  { key: "tenant.manage", label: "Manage tenants" },
  { key: "tenant.view", label: "View tenants" },
  { key: "plan.manage", label: "Manage plans" },
  { key: "subscription.view", label: "View subscriptions" },
  { key: "roles.manage", label: "Manage roles & permissions" },
  { key: "audit.view", label: "View audit logs" },
  { key: "languages.manage", label: "Manage languages" },
  { key: "system.settings", label: "Manage system settings" },
] as const;

// Tenant-scope permissions (Tenant dashboard)
export const TENANT_PERMISSIONS = [
  { key: "dashboard.view", label: "View tenant dashboard" },
  { key: "member.view", label: "View members" },
  { key: "member.invite", label: "Invite members" },
  { key: "member.manage", label: "Manage members" },
  { key: "org.settings", label: "Manage tenant settings" },
  { key: "org.data", label: "Manage tenant data" },
  { key: "profile.manage", label: "Manage own profile" },
  { key: "sessions.manage", label: "Manage active sessions" },
] as const;

export const SYSTEM_ROLE_MAP: Record<string, string> = {
  superadmin: "super_admin",
  admin: "admin",
  user: "user",
};

export const TENANT_ROLE_MAP: Record<string, string> = {
  owner: "owner",
  admin: "admin",
  member: "member",
};

export const DEFAULT_ROLES = [
  {
    scope: "system" as Scope,
    name: "super_admin",
    label: "Super Admin",
    description: "Full platform access with all system permissions.",
    isDefault: true,
    permissions: SYSTEM_PERMISSIONS.map((p) => p.key),
  },
  {
    scope: "system" as Scope,
    name: "admin",
    label: "Admin",
    description: "Manages platform users, tenants, subscriptions and audit logs.",
    isDefault: true,
    permissions: [
      "dashboard.view",
      "user.manage",
      "user.role_change",
      "tenant.view",
      "tenant.manage",
      "subscription.view",
      "audit.view",
    ],
  },
  {
    scope: "system" as Scope,
    name: "user",
    label: "User",
    description: "Standard platform user with tenant dashboard access.",
    isDefault: true,
    permissions: ["dashboard.view"],
  },
  {
    scope: "tenant" as Scope,
    name: "owner",
    label: "Owner",
    description: "Full tenant access including member management and settings.",
    isDefault: true,
    permissions: TENANT_PERMISSIONS.map((p) => p.key),
  },
  {
    scope: "tenant" as Scope,
    name: "admin",
    label: "Admin",
    description: "Manages tenant members, invites and organization data.",
    isDefault: true,
    permissions: [
      "dashboard.view",
      "member.view",
      "member.invite",
      "member.manage",
      "org.settings",
      "org.data",
      "sessions.manage",
      "profile.manage",
    ],
  },
  {
    scope: "tenant" as Scope,
    name: "member",
    label: "Member",
    description: "Read-only tenant member with personal profile access.",
    isDefault: true,
    permissions: ["dashboard.view", "member.view", "org.data", "profile.manage"],
  },
];

const roleCache = new Map<string, Set<string>>();

/** Load the permission keys for a role (cached per scope:name). */
export async function getRolePermissions(scope: Scope, roleName: string): Promise<Set<string>> {
  const cacheKey = `${scope}:${roleName}`;
  const cached = roleCache.get(cacheKey);
  if (cached) return cached;

  const role = await prisma.role.findUnique({
    where: { scope_name: { scope, name: roleName } },
    include: { permissions: { include: { permission: true } } },
  });

  const perms = new Set<string>();
  if (role) {
    for (const rp of role.permissions) perms.add(rp.permission.key);
  }
  roleCache.set(cacheKey, perms);
  return perms;
}

export async function hasSystemPermission(userId: number, key: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return false;

  const perms = await getRolePermissions("system", SYSTEM_ROLE_MAP[user.role] || "user");
  if (perms.has("*") || perms.has(key)) return true;

  const extra = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  for (const ur of extra) {
    if (ur.role.scope !== "system") continue;
    for (const rp of ur.role.permissions) {
      if (rp.permission.key === "*" || rp.permission.key === key) return true;
    }
  }
  return false;
}

export async function hasTenantPermission(userId: number, orgId: number, key: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerUserId: true, status: true },
  });
  if (!org) return false;
  if (org.status !== "active") return false;
  if (org.ownerUserId === userId) return true;

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
    select: { role: true },
  });
  if (!member) return false;

  const perms = await getRolePermissions("tenant", TENANT_ROLE_MAP[member.role] || "member");
  return perms.has(key);
}

export async function hasPermission(
  userId: number,
  scope: Scope,
  key: string,
  orgId?: number
): Promise<boolean> {
  if (scope === "system") return hasSystemPermission(userId, key);
  if (orgId == null) return false;
  return hasTenantPermission(userId, orgId, key);
}

/** System permission keys for a user, used to build the JWT permission list. */
export async function getSystemPermissions(userId: number): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return [];
  return Array.from(await getRolePermissions("system", SYSTEM_ROLE_MAP[user.role] || "user"));
}

/** Tenant membership + role for a user, or null if they don't belong to the org. */
export async function getOrgMembership(orgId: number, userId: number) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return null;
  if (org.ownerUserId === userId) return { role: "owner" as const };
  const member = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
  if (!member) return null;
  return { role: member.role };
}

// ── Seed support ──────────────────────────────────────────────

export async function seedPermissionsAndRoles() {
  const permIds = new Map<string, number>();

  for (const p of SYSTEM_PERMISSIONS) {
    const rec = await prisma.permission.upsert({
      where: { scope_key: { scope: "system", key: p.key } },
      update: { label: p.label },
      create: { scope: "system", key: p.key, label: p.label },
    });
    permIds.set(`system:${p.key}`, rec.id);
  }
  for (const p of TENANT_PERMISSIONS) {
    const rec = await prisma.permission.upsert({
      where: { scope_key: { scope: "tenant", key: p.key } },
      update: { label: p.label },
      create: { scope: "tenant", key: p.key, label: p.label },
    });
    permIds.set(`tenant:${p.key}`, rec.id);
  }

  for (const role of DEFAULT_ROLES) {
    const roleRec = await prisma.role.upsert({
      where: { scope_name: { scope: role.scope, name: role.name } },
      update: { label: role.label, description: role.description, isDefault: role.isDefault },
      create: { scope: role.scope, name: role.name, label: role.label, description: role.description, isDefault: role.isDefault },
    });

    // Link permissions
    const permissionIds = role.permissions.map((key) => permIds.get(`${role.scope}:${key}`)!).filter(Boolean);
    for (const pid of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleRec.id, permissionId: pid } },
        update: {},
        create: { roleId: roleRec.id, permissionId: pid },
      });
    }
  }
}
