import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

  try {
    const invite = await prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { org: { select: { name: true } } },
    });

    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      orgName: invite.org.name,
      orgId: invite.orgId,
      firstName: invite.firstName,
      lastName: invite.lastName,
      timezone: invite.timezone,
      language: invite.language,
      hasAccount: Boolean(existingUser),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
