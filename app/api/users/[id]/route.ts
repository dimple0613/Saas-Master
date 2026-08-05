import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { hasSystemPermission } from "@/lib/permissions";

const VALID_ROLES = ["admin", "superadmin", "user"];
const VALID_STATUSES = ["active", "inactive", "suspended"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "user.role_change"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { role, status } = await req.json();
  const targetId = parseInt(id);

  // Fetch the actor's platform role to enforce the role-change hierarchy.
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isSuperadmin = actor?.role === "superadmin";

  const data: Record<string, string> = {};
  if (role) {
    if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (targetId === userId) return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Only a superadmin may grant superadmin or touch existing admin/superadmin accounts.
    if (!isSuperadmin) {
      if (target.role === "superadmin" || target.role === "admin") {
        return NextResponse.json({ error: "Only a superadmin can change roles of admins" }, { status: 403 });
      }
      if (role === "superadmin" || role === "admin") {
        return NextResponse.json({ error: "Only a superadmin can assign admin roles" }, { status: 403 });
      }
    }
    data.role = role;
  }
  if (status) {
    if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (targetId === userId) return NextResponse.json({ error: "Cannot change your own status" }, { status: 400 });
    if (!isSuperadmin) {
      const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
      if (target?.role === "superadmin") {
        return NextResponse.json({ error: "Only a superadmin can change a superadmin's status" }, { status: 403 });
      }
    }
    data.status = status;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    await prisma.user.update({ where: { id: targetId }, data });
    await logActivity({ userId, action: "user.update", details: JSON.stringify({ target_user_id: targetId, ...data }) });
    return NextResponse.json({ message: "User updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "user.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (parseInt(id) === userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    await logActivity({ userId, action: "user.delete", details: JSON.stringify({ target_user_id: parseInt(id) }) });
    return NextResponse.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
