import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { PlatformRole, UserKind, UserStatus } from "@prisma/client";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "admin.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const adminId = parseInt(id);
    const existing = await prisma.user.findUnique({ where: { id: adminId } });
    if (!existing || existing.kind !== "admin") return NextResponse.json({ error: "Admin not found" }, { status: 404 });

    const { email, firstName, lastName, password, role, adminGroupId, status } = await req.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    if (email !== undefined) {
      const normalized = String(email).toLowerCase();
      const dup = await prisma.user.findUnique({ where: { email: normalized } });
      if (dup && dup.id !== adminId) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      data.email = normalized;
    }
    if (firstName !== undefined) data.firstName = firstName ? String(firstName) : null;
    if (lastName !== undefined) data.lastName = lastName ? String(lastName) : null;
    if (password) data.password = await bcrypt.hash(String(password), 10);
    if (role !== undefined) {
      if (!["superadmin", "admin", "user"].includes(String(role))) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      data.role = role as PlatformRole;
    }
    if (adminGroupId !== undefined) data.adminGroupId = adminGroupId ? parseInt(String(adminGroupId)) : null;
    if (status !== undefined) {
      if (!["active", "inactive", "suspended"].includes(String(status))) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = status as UserStatus;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: adminId }, data });
    await logActivity({ userId, action: "admin.update", details: JSON.stringify({ admin_id: adminId }) });
    return NextResponse.json({ message: "Admin updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "admin.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const adminId = parseInt(id);
    if (adminId === userId) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { id: adminId } });
    if (!existing || existing.kind !== "admin") return NextResponse.json({ error: "Admin not found" }, { status: 404 });

    await prisma.user.update({
      where: { id: adminId },
      data: { kind: UserKind.customer, status: "inactive" as UserStatus },
    });
    await logActivity({ userId, action: "admin.delete", details: JSON.stringify({ admin_id: adminId, email: existing.email }) });
    return NextResponse.json({ message: "Admin deactivated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
