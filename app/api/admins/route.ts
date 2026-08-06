import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { UserKind, PlatformRole } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "admin.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admins = await prisma.user.findMany({
      where: { kind: UserKind.admin },
      include: { adminGroup: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      admins: admins.map((a) => ({
        id: a.id,
        email: a.email,
        firstName: a.firstName,
        lastName: a.lastName,
        role: a.role,
        status: a.status,
        adminGroup: a.adminGroup ? { id: a.adminGroup.id, name: a.adminGroup.name } : null,
        lastLogin: null,
        createdAt: a.createdAt.toISOString(),
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

  const { email, firstName, lastName, password, role, adminGroupId } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const platformRole = (role as PlatformRole) || "admin";
  if (!["superadmin", "admin", "user"].includes(platformRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: String(email) } });
    if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const admin = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: passwordHash,
        firstName: firstName ? String(firstName) : null,
        lastName: lastName ? String(lastName) : null,
        kind: UserKind.admin,
        role: platformRole,
        adminGroupId: adminGroupId ? parseInt(String(adminGroupId)) : null,
      },
    });
    await logActivity({ userId, action: "admin.create", details: JSON.stringify({ admin_id: admin.id, email: admin.email }) });
    return NextResponse.json({ id: admin.id, message: "Admin created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
