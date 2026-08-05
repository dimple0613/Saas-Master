import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { getOrgMembership, hasTenantPermission } from "@/lib/permissions";

const VALID_ROLES = ["owner", "admin", "member"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, mid } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const canManage = await hasTenantPermission(userId, orgId, "member.manage");
  if (!canManage) return NextResponse.json({ error: "Only the owner or admin can do this" }, { status: 403 });

  const { role } = await req.json();
  if (!role || !VALID_ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  try {
    const member = await prisma.orgMember.findUnique({ where: { id: parseInt(mid) }, select: { id: true, orgId: true } });
    if (!member || member.orgId !== orgId) {
      return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });
    }
    await prisma.orgMember.update({ where: { id: member.id }, data: { role } });
    await logActivity({ userId, orgId, action: "member.role_change", details: JSON.stringify({ member_id: member.id, new_role: role }) });
    return NextResponse.json({ message: "Role updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, mid } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const canManage = await hasTenantPermission(userId, orgId, "member.manage");
  if (!canManage) return NextResponse.json({ error: "Only the owner or admin can do this" }, { status: 403 });

  try {
    const member = await prisma.orgMember.findUnique({ where: { id: parseInt(mid) }, select: { id: true, orgId: true, userId: true } });
    if (!member || member.orgId !== orgId) {
      return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });
    }
    const targetMembership = await getOrgMembership(orgId, member.userId);
    if (targetMembership?.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the organization owner" }, { status: 400 });
    }
    await prisma.orgMember.delete({ where: { id: member.id } });
    await logActivity({ userId, orgId, action: "member.remove", details: JSON.stringify({ member_id: member.id }) });
    return NextResponse.json({ message: "Member removed" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
