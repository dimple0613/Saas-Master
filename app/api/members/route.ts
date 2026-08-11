import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTenantPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const isPlatformAdmin = session.user.role === "superadmin" || session.user.role === "admin";
  const orgIdParam = req.nextUrl.searchParams.get("orgId");
  const orgId = orgIdParam ? parseInt(orgIdParam) : null;

  try {
    if (!isPlatformAdmin) {
      if (!orgId || Number.isNaN(orgId)) {
        return NextResponse.json({ error: "An organization is required" }, { status: 400 });
      }
      const canView = await hasTenantPermission(userId, orgId, "member.view");
      if (!canView) return NextResponse.json({ error: "You do not have permission to view members" }, { status: 403 });
    }

    const where = orgId && !Number.isNaN(orgId) ? { orgId } : {};

    const [orgMembers, invitations] = await Promise.all([
      prisma.orgMember.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.invitation.findMany({
        where: { ...where, used: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const members = [
      ...orgMembers.map((m) => ({
        id: `member-${m.id}`,
        kind: "member" as const,
        avatarId: m.id,
        name: `${m.user.firstName || ""} ${m.user.lastName || ""}`.trim() || m.user.email,
        email: m.user.email,
        phone: m.user.phone || "",
        role: m.role,
        status: "active" as const,
        joined: m.createdAt,
        orgId: m.orgId,
        memberId: m.id,
        invitationId: null as number | null,
      })),
      ...invitations.map((inv) => ({
        id: `invitation-${inv.id}`,
        kind: "invitation" as const,
        avatarId: inv.id,
        name: `${inv.firstName || ""} ${inv.lastName || ""}`.trim() || inv.email,
        email: inv.email,
        phone: "",
        role: inv.role,
        status: "invitation_pending" as const,
        joined: inv.createdAt,
        orgId: inv.orgId,
        memberId: null as number | null,
        invitationId: inv.id,
      })),
    ].sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime());

    return NextResponse.json({ members });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
