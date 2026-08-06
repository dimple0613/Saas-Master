import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

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
    const groupId = parseInt(id);
    const existing = await prisma.adminGroup.findUnique({ where: { id: groupId } });
    if (!existing) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const { name, description, isActive } = await req.json().catch(() => ({}));
    if (name !== undefined) {
      const dup = await prisma.adminGroup.findUnique({ where: { name: String(name) } });
      if (dup && dup.id !== groupId) return NextResponse.json({ error: "A group with this name already exists" }, { status: 409 });
    }

    await prisma.adminGroup.update({
      where: { id: groupId },
      data: {
        name: name !== undefined ? String(name) : existing.name,
        description: description !== undefined ? (description ? String(description) : null) : existing.description,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });
    await logActivity({ userId, action: "admin_group.update", details: JSON.stringify({ group_id: groupId }) });
    return NextResponse.json({ message: "Group updated" });
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
    const groupId = parseInt(id);
    const existing = await prisma.adminGroup.findUnique({ where: { id: groupId } });
    if (!existing) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    await prisma.adminGroup.delete({ where: { id: groupId } });
    await logActivity({ userId, action: "admin_group.delete", details: JSON.stringify({ group_id: groupId }) });
    return NextResponse.json({ message: "Group deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
