import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

  try {
    const invite = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    if (invite.email !== session.user.email) {
      return NextResponse.json({ error: "This invitation is for a different email address" }, { status: 403 });
    }

    const userId = parseInt(session.user.id);

    const alreadyMember = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: invite.orgId, userId } } });
    if (alreadyMember) return NextResponse.json({ error: "You are already a member of this organization" }, { status: 409 });

    await prisma.orgMember.create({
      data: { orgId: invite.orgId, userId, role: invite.role, invitedBy: invite.invitedBy },
    });

    await prisma.invitation.update({ where: { id: invite.id }, data: { used: true } });

    return NextResponse.json({ message: "You have joined the organization", orgId: invite.orgId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
