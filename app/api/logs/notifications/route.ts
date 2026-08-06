import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "log.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "all";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

  try {
    const logs = await prisma.activityLog.findMany({
      where: action !== "all" ? { action } : {},
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        details: l.details,
        createdAt: l.createdAt.toISOString(),
        actor: l.user ? `${l.user.firstName || ""} ${l.user.lastName || ""}`.trim() || l.user.email : "System",
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
