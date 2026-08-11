import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

  try {
    const invite = await prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { org: { select: { name: true } } },
    });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });

    let userId: number;

    if (existingUser) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Please sign in to accept this invitation" }, { status: 401 });
      }
      if (invite.email !== session.user.email) {
        return NextResponse.json({ error: "This invitation is for a different email address" }, { status: 403 });
      }
      userId = parseInt(session.user.id);
    } else {
      if (!password || typeof password !== "string") {
        return NextResponse.json({ error: "Password is required to create your account" }, { status: 400 });
      }
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(password, 10);
      const created = await prisma.user.create({
        data: {
          email: invite.email,
          password: hashed,
          firstName: invite.firstName || "",
          lastName: invite.lastName || "",
          timezone: invite.timezone || "UTC",
          language: invite.language || "en",
        },
      });
      userId = created.id;
    }

    const alreadyMember = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: invite.orgId, userId } } });
    if (alreadyMember) return NextResponse.json({ error: "You are already a member of this organization" }, { status: 409 });

    await prisma.orgMember.create({
      data: { orgId: invite.orgId, userId, role: invite.role, invitedBy: invite.invitedBy },
    });

    await prisma.invitation.update({ where: { id: invite.id }, data: { used: true } });

    return NextResponse.json({
      message: "You have joined the organization",
      orgId: invite.orgId,
      orgName: invite.org?.name || null,
      created: !existingUser,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
