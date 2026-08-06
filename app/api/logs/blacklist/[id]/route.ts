import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "log.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const entryId = parseInt(id);
    const existing = await prisma.blacklist.findUnique({ where: { id: entryId } });
    if (!existing) return NextResponse.json({ error: "Blacklist entry not found" }, { status: 404 });

    await prisma.blacklist.delete({ where: { id: entryId } });
    await logActivity({ userId, action: "blacklist.remove", details: JSON.stringify({ email_or_domain: existing.emailOrDomain }) });
    return NextResponse.json({ message: "Removed from blacklist" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
