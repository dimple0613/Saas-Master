import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { hasTenantPermission } from "@/lib/permissions";
import { sendMail } from "@/lib/mail";
import { inviteMemberTemplate } from "@/lib/mail-templates";
import crypto from "crypto";
import { hashToken } from "@/lib/tokens";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const canInvite = await hasTenantPermission(userId, orgId, "member.invite");
  if (!canInvite) return NextResponse.json({ error: "You do not have permission to invite members" }, { status: 403 });

  const { email, role } = await req.json();
  if (!email || !role) return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
  if (!["owner", "admin", "member"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  try {
    const inviteUser = await prisma.user.findUnique({ where: { email } });
    if (inviteUser) {
      const existingMember = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: inviteUser.id } } });
      if (existingMember) return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.invitation.create({
      data: { orgId, email, tokenHash: hashToken(token), role, invitedBy: userId, expiresAt },
    });

    const [org, inviter] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    try {
      await sendMail({
        to: email,
        subject: `You're invited to join ${org?.name || "an organization"} on ${process.env.APP_NAME || "Acme Inc"}`,
        html: inviteMemberTemplate(
          { name: "", email },
          {
            inviterName: `${inviter?.firstName || "A"} ${inviter?.lastName || "team member"}`.trim() || "A team member",
            orgName: org?.name || "an organization",
            role,
            token,
          }
        ),
      });
    } catch (err) {
      console.error("[invite] Failed to send invitation email:", err);
    }

    await logActivity({ userId, orgId, action: "member.invite", details: JSON.stringify({ email, role }) });

    return NextResponse.json({ token, message: "Invitation created", link: `/invite?token=${token}` }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
