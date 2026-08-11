import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { hasTenantPermission, hasSystemPermission } from "@/lib/permissions";
import { sendMail } from "@/lib/mail";
import { inviteMemberTemplate } from "@/lib/mail-templates";
import { hashToken } from "@/lib/tokens";
import { generateInviteToken, getInviteExpiry, getInviteExpiryHours } from "@/lib/invites";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const isPlatformAdmin =
    session.user.role === "superadmin" || session.user.role === "admin";
  const canInvite = isPlatformAdmin
    ? await hasSystemPermission(userId, "user.manage")
    : await hasTenantPermission(userId, orgId, "member.invite");
  if (!canInvite) return NextResponse.json({ error: "You do not have permission to invite members" }, { status: 403 });

  const { email, role, firstName, lastName, timezone, language } = await req.json();
  if (!email || !role) return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
  if (!["admin", "member"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  try {
    const inviteUser = await prisma.user.findUnique({ where: { email } });
    if (inviteUser) {
      const existingMember = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: inviteUser.id } } });
      if (existingMember) return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    const token = generateInviteToken();
    const expiresAt = getInviteExpiry();

    const existingInvitation = await prisma.invitation.findUnique({
      where: { orgId_email: { orgId, email } },
    });

    if (existingInvitation) {
      await prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: {
          tokenHash: hashToken(token),
          role: role as "admin" | "member",
          firstName: firstName || null,
          lastName: lastName || null,
          timezone: timezone || "UTC",
          language: language || "en",
          expiresAt,
          used: false,
        },
      });
    } else {
      await prisma.invitation.create({
        data: {
          orgId,
          email,
          tokenHash: hashToken(token),
          role: role as "admin" | "member",
          firstName: firstName || null,
          lastName: lastName || null,
          timezone: timezone || "UTC",
          language: language || "en",
          invitedBy: userId,
          expiresAt,
        },
      });
    }

    const [org, inviter] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    const inviterName = `${inviter?.firstName || ""} ${inviter?.lastName || ""}`.trim() || inviter?.email || "A team member";

    try {
      await sendMail({
        to: email,
        subject: `You're invited to join ${org?.name || "an organization"} on ${process.env.APP_NAME || "Acme Inc"}`,
        html: inviteMemberTemplate(
          { name: `${firstName || ""} ${lastName || ""}`.trim() || email, email },
          {
            inviterName,
            orgName: org?.name || "an organization",
            role,
            token,
            expiresInHours: getInviteExpiryHours(),
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
