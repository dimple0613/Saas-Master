import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgMembership, hasTenantPermission } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const membership = await getOrgMembership(orgId, userId);
  if (!membership) return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });

  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const members = await prisma.orgMember.findMany({
      where: { orgId, NOT: { userId: org.ownerUserId } },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });

    const owner = await prisma.user.findUnique({
      where: { id: org.ownerUserId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    return NextResponse.json({
      org,
      members: members.map((m) => ({
        member_id: m.id,
        role: m.role,
        joined_at: m.createdAt,
        user_id: m.user.id,
        email: m.user.email,
        first_name: m.user.firstName,
        last_name: m.user.lastName,
      })),
      owner,
      myRole: membership.role,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const canManageSettings = await hasTenantPermission(userId, orgId, "org.settings");
  if (!canManageSettings) return NextResponse.json({ error: "Only the owner or admin can do this" }, { status: 403 });

  try {
    const { name, description } = await req.json();
    if (!name || !name.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    await prisma.organization.update({ where: { id: orgId }, data: { name: name.trim(), description: (description || "").trim() } });
    return NextResponse.json({ message: "Organization updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
