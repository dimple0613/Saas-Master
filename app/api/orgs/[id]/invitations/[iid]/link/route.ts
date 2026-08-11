import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { hasTenantPermission, hasSystemPermission } from "@/lib/permissions";
import { hashToken } from "@/lib/tokens";
import { generateInviteToken, getInviteExpiry } from "@/lib/invites";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; iid: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, iid } = await params;
  const orgId = parseInt(id);
  const invitationId = parseInt(iid);
  const userId = parseInt(session.user.id);

  const isPlatformAdmin = session.user.role === "superadmin" || session.user.role === "admin";
  const canManage = isPlatformAdmin
    ? await hasSystemPermission(userId, "user.manage")
    : await hasTenantPermission(userId, orgId, "member.invite");
  if (!canManage) return NextResponse.json({ error: "You do not have permission to manage invitations" }, { status: 403 });

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { id: true, orgId: true, email: true, used: true, expiresAt: true },
    });
    if (!invitation || invitation.orgId !== orgId) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    if (invitation.used) {
      return NextResponse.json({ error: "Invitation has already been accepted" }, { status: 400 });
    }

    const token = generateInviteToken();
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { tokenHash: hashToken(token), expiresAt: getInviteExpiry(), used: false },
    });

    await logActivity({ userId, orgId, action: "member.invite_link", details: JSON.stringify({ email: invitation.email }) });

    return NextResponse.json({ link: `/invite?token=${token}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
