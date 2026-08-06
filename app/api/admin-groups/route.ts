import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const groups = await prisma.adminGroup.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        isActive: g.isActive,
        userCount: g._count.users,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "admin.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await req.json().catch(() => ({}));
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const existing = await prisma.adminGroup.findUnique({ where: { name: String(name) } });
    if (existing) return NextResponse.json({ error: "A group with this name already exists" }, { status: 409 });

    const group = await prisma.adminGroup.create({
      data: { name: String(name), description: description ? String(description) : null },
    });
    await logActivity({ userId, action: "admin_group.create", details: JSON.stringify({ group_id: group.id, name: group.name }) });
    return NextResponse.json({ id: group.id, message: "Group created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
