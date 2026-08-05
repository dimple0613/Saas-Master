import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { id: true, email: true, firstName: true, lastName: true, orgName: true, role: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    org_name: user.orgName,
    role: user.role,
    created_at: user.createdAt,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { first_name, last_name } = await req.json();
    if (!first_name || !first_name.trim()) return NextResponse.json({ error: "First name is required" }, { status: 400 });

    await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: { firstName: first_name.trim(), lastName: (last_name || "").trim() },
    });

    await logActivity({ userId: parseInt(session.user.id), action: "profile.update", details: JSON.stringify({ first_name: first_name.trim(), last_name: (last_name || "").trim() }) });

    return NextResponse.json({ message: "Profile updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
