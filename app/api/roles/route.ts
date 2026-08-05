import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const SYSTEM_ENUM_LOOKUP: Record<string, "superadmin" | "admin" | "user"> = {
  super_admin: "superadmin",
  admin: "admin",
  user: "user",
};

const TENANT_ENUM_LOOKUP: Record<string, "owner" | "admin" | "member"> = {
  owner: "owner",
  admin: "admin",
  member: "member",
};

async function requireRolesManage(userId: string | number) {
  if (!(await hasSystemPermission(parseInt(String(userId)), "roles.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const denied = await requireRolesManage(session.user.id);
  if (denied) return denied;

  const roles = await prisma.role.findMany({
    orderBy: [{ scope: "asc" }, { name: "asc" }],
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  const enriched = await Promise.all(
    roles.map(async (role) => {
      let users = role._count.users;
      if (role.scope === "system" && SYSTEM_ENUM_LOOKUP[role.name]) {
        users += await prisma.user.count({ where: { role: SYSTEM_ENUM_LOOKUP[role.name] } });
      } else if (role.scope === "tenant" && TENANT_ENUM_LOOKUP[role.name]) {
        users += await prisma.orgMember.count({ where: { role: TENANT_ENUM_LOOKUP[role.name] } });
      }
      return {
        id: role.id,
        scope: role.scope,
        name: role.name,
        label: role.label,
        description: role.description,
        isDefault: role.isDefault,
        isActive: role.isActive,
        users,
        permissionKeys: role.permissions.map((rp) => rp.permission.key),
      };
    })
  );

  return NextResponse.json({ roles: enriched });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const denied = await requireRolesManage(session.user.id);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { scope, name, label, description, isActive, permissions } = body as {
    scope?: string;
    name?: string;
    label?: string;
    description?: string;
    isActive?: boolean;
    permissions?: string[];
  };

  if (!scope || !name || !label) {
    return NextResponse.json({ error: "Scope, name and label are required" }, { status: 400 });
  }
  if (scope !== "system" && scope !== "tenant") {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, "_");
  const existing = await prisma.role.findUnique({ where: { scope_name: { scope, name: slug } } });
  if (existing) {
    return NextResponse.json({ error: "A role with this name already exists in this scope" }, { status: 409 });
  }

  try {
    const role = await prisma.role.create({
      data: {
        scope,
        name: slug,
        label: label.trim(),
        description: description?.trim() || null,
        isActive: isActive ?? true,
        permissions: {
          create: (permissions || []).map((key) => ({
            permission: { connect: { scope_key: { scope, key } } },
          })),
        },
      },
    });

    await logActivity({
      userId: parseInt(session.user.id),
      action: "role.create",
      details: `Created role "${label}" (${scope})`,
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid permission keys" }, { status: 400 });
  }
}
