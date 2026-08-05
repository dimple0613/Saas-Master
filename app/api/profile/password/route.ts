import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) return NextResponse.json({ error: "Both fields are required" }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) }, select: { password: true } });
    if (!user || !user.password) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: parseInt(session.user.id) }, data: { password: hashed } });

    await logActivity({ userId: parseInt(session.user.id), action: "password.change" });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
