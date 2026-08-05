import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const VALID_STATUSES = ["active", "inactive", "suspended"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "tenant.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = parseInt(id);
  const { status } = await req.json().catch(() => ({}));
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    await prisma.organization.update({ where: { id: orgId }, data: { status } });
    await logActivity({ userId, action: "tenant.status_change", details: JSON.stringify({ org_id: orgId, new_status: status }) });
    return NextResponse.json({ message: `Organization ${status}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
