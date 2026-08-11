import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { hasTenantPermission, hasSystemPermission } from "@/lib/permissions";

export async function DELETE(
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
      select: { id: true, orgId: true, email: true },
    });
    if (!invitation || invitation.orgId !== orgId) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    await prisma.invitation.delete({ where: { id: invitation.id } });
    await logActivity({ userId, orgId, action: "member.invite_withdraw", details: JSON.stringify({ email: invitation.email }) });

    return NextResponse.json({ message: "Invitation withdrawn" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
