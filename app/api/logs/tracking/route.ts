import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { EmailTrackingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "log.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search")?.trim() || null;

  const where: Prisma.TrackingLogWhereInput = {
    ...(status !== "all"
      ? { status: status as EmailTrackingStatus }
      : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const logs = await prisma.trackingLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    const totals = await prisma.trackingLog.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const counts = {
      sent: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    };
    for (const row of totals) {
      counts[row.status as keyof typeof counts] = row._count._all;
    }

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        email: l.email,
        subject: l.subject,
        status: l.status,
        openedAt: l.openedAt?.toISOString() || null,
        clickedAt: l.clickedAt?.toISOString() || null,
        createdAt: l.createdAt.toISOString(),
      })),
      counts,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
