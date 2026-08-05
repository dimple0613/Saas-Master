import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

async function requireRolesManage(userId: string | number) {
  if (!(await hasSystemPermission(parseInt(String(userId)), "roles.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

async function getRole(id: string) {
  return prisma.role.findUnique({
    where: { id: parseInt(id) },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const denied = await requireRolesManage(session.user.id);
  if (denied) return denied;

  const { id } = await params;
  const role = await getRole(id);
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  return NextResponse.json({
    role: {
      id: role.id,
      scope: role.scope,
      name: role.name,
      label: role.label,
      description: role.description,
      isDefault: role.isDefault,
      isActive: role.isActive,
      permissionKeys: role.permissions.map((rp) => rp.permission.key),
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const denied = await requireRolesManage(session.user.id);
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.role.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { label, description, isActive, permissions, name } = body as {
    label?: string;
    description?: string;
    isActive?: boolean;
    permissions?: string[];
    name?: string;
  };

  const nextName =
    name && name.trim() ? name.trim().toLowerCase().replace(/\s+/g, "_") : existing.name;

  if (nextName !== existing.name) {
    const dup = await prisma.role.findUnique({ where: { scope_name: { scope: existing.scope, name: nextName } } });
    if (dup) return NextResponse.json({ error: "A role with this name already exists in this scope" }, { status: 409 });
  }

  let validPerms: { key: string; id: number }[] = [];
  if (permissions) {
    const keys = Array.from(new Set(permissions));
    validPerms = await prisma.permission.findMany({
      where: { scope: existing.scope, key: { in: keys } },
      select: { id: true, key: true },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: existing.id } });
    await tx.role.update({
      where: { id: existing.id },
      data: {
        name: nextName,
        label: label?.trim() || existing.label,
        description: description?.trim() ?? existing.description,
        isActive: isActive ?? existing.isActive,
      },
    });
    if (validPerms.length > 0) {
      await tx.rolePermission.createMany({
        data: validPerms.map((p) => ({ roleId: existing.id, permissionId: p.id })),
      });
    }
  });

  await logActivity({
    userId: parseInt(session.user.id),
    action: "role.update",
    details: `Updated role "${existing.label}" (${existing.scope})`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const denied = await requireRolesManage(session.user.id);
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.role.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (existing.isDefault) {
    return NextResponse.json({ error: "Default roles cannot be removed" }, { status: 400 });
  }

  await prisma.role.delete({ where: { id: existing.id } });

  await logActivity({
    userId: parseInt(session.user.id),
    action: "role.delete",
    details: `Deleted role "${existing.label}" (${existing.scope})`,
  });

  return NextResponse.json({ ok: true });
}
