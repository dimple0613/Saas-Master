import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { hasTenantPermission } from "@/lib/permissions";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, did } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const canWrite = await hasTenantPermission(userId, orgId, "org.data");
  if (!canWrite) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

  const { title, content } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  try {
    const row = await prisma.orgProfileData.findUnique({ where: { id: parseInt(did) }, select: { orgId: true } });
    if (!row || row.orgId !== orgId) {
      return NextResponse.json({ error: "Row not found in this organization" }, { status: 404 });
    }
    await prisma.orgProfileData.update({
      where: { id: parseInt(did) },
      data: { title, content: content || null },
    });
    await logActivity({ userId, orgId, action: "data.update", details: JSON.stringify({ title, data_id: parseInt(did) }) });
    return NextResponse.json({ message: "Row updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, did } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const canWrite = await hasTenantPermission(userId, orgId, "org.data");
  if (!canWrite) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

  try {
    const row = await prisma.orgProfileData.findUnique({ where: { id: parseInt(did) }, select: { orgId: true } });
    if (!row || row.orgId !== orgId) {
      return NextResponse.json({ error: "Row not found in this organization" }, { status: 404 });
    }
    await prisma.orgProfileData.delete({ where: { id: parseInt(did) } });
    await logActivity({ userId, orgId, action: "data.delete", details: JSON.stringify({ data_id: parseInt(did) }) });
    return NextResponse.json({ message: "Row deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
