import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = parseInt(session.user.id);

  try {
    const active = await prisma.activeSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
    });
    const revoked = await prisma.activeSession.findMany({
      where: { userId, revokedAt: { not: null } },
      orderBy: { revokedAt: "desc" },
      take: 10,
    });
    return NextResponse.json({
      active: active.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        lastSeenAt: s.lastSeenAt?.toISOString() || null,
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: s.tokenHash === hashToken((session.user as { sid?: string }).sid || ""),
      })),
      revoked: revoked.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISOString(),
        revokedAt: s.revokedAt?.toISOString() || null,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Session id is required" }, { status: 400 });

  try {
    const target = await prisma.activeSession.findUnique({ where: { id: parseInt(id) } });
    if (!target || target.userId !== userId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    await prisma.activeSession.update({ where: { id: target.id }, data: { revokedAt: new Date() } });
    await logActivity({ userId, action: "session.revoke", details: JSON.stringify({ session_id: target.id }) });
    return NextResponse.json({ message: "Session revoked" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
