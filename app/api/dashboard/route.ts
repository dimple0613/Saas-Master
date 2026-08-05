import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgMembership } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const role = String(session.user.role);
  const userId = parseInt(session.user.id);
  const orgIdParam = req.nextUrl.searchParams.get("orgId");
  const orgId = orgIdParam ? parseInt(orgIdParam) : null;

  try {
    // Non-superadmins may only view dashboards for orgs they belong to.
    if (orgId && role !== "superadmin") {
      const membership = await getOrgMembership(orgId, userId);
      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (role === "superadmin") {
      const totalOrgs = await prisma.organization.count();
      const totalUsers = await prisma.user.count();
      const totalRecords = await prisma.orgProfileData.count();
      const recentActivity = await prisma.activityLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { firstName: true, lastName: true } }, org: { select: { name: true } } },
      });
      const monthlyData = await prisma.$queryRawUnsafe<{ month: string; count: bigint }[]>(`
        SELECT TO_CHAR(created_at, 'Mon') AS month, COUNT(*) AS count
        FROM activity_logs
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `);
      return NextResponse.json({
        stats: { totalOrgs, totalUsers, totalRecords, activeNow: totalUsers },
        chartData: monthlyData.map((d) => ({ month: d.month, value: Number(d.count) })),
        recentActivity: recentActivity.map((a) => ({
          name: `${a.user.firstName || ""} ${a.user.lastName || ""}`.trim() || "Unknown",
          action: a.details || a.action,
          org: a.org?.name || "Platform",
          time: a.createdAt.toISOString(),
        })),
      });
    }

    if (!orgId) {
      const firstMembership = await prisma.orgMember.findFirst({
        where: { userId },
        select: { orgId: true },
        orderBy: { createdAt: "asc" },
      });
      if (!firstMembership) {
        return NextResponse.json({ stats: null, chartData: [], recentActivity: [], myRecords: [] });
      }
      const resolvedOrgId = firstMembership.orgId;

      if (role === "admin") {
        const memberCount = await prisma.orgMember.count({ where: { orgId: resolvedOrgId } });
        const recordCount = await prisma.orgProfileData.count({ where: { orgId: resolvedOrgId } });
        const pendingInvites = await prisma.invitation.count({ where: { orgId: resolvedOrgId, used: false, expiresAt: { gt: new Date() } } });
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const activityThisWeek = await prisma.activityLog.count({ where: { orgId: resolvedOrgId, createdAt: { gte: weekAgo } } });
        const recentActivity = await prisma.activityLog.findMany({
          where: { orgId: resolvedOrgId },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { firstName: true, lastName: true } } },
        });
        const monthlyData = await prisma.$queryRawUnsafe<{ month: string; count: bigint }[]>(`
          SELECT TO_CHAR(created_at, 'Mon') AS month, COUNT(*) AS count
          FROM activity_logs
          WHERE org_id = ${resolvedOrgId} AND created_at >= NOW() - INTERVAL '12 months'
          GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
          ORDER BY DATE_TRUNC('month', created_at)
        `);
        const memberGrowth = await prisma.$queryRawUnsafe<{ month: string; count: bigint }[]>(`
          SELECT TO_CHAR(created_at, 'Mon') AS month, COUNT(*) AS count
          FROM org_members
          WHERE org_id = ${resolvedOrgId} AND created_at >= NOW() - INTERVAL '12 months'
          GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
          ORDER BY DATE_TRUNC('month', created_at)
        `);
        return NextResponse.json({
          resolvedOrgId,
          stats: { memberCount, recordCount, pendingInvites, activityThisWeek },
          chartData: monthlyData.map((d) => ({ month: d.month, value: Number(d.count) })),
          memberGrowth: memberGrowth.map((d) => ({ month: d.month, value: Number(d.count) })),
          recentActivity: recentActivity.map((a) => ({
            name: `${a.user.firstName || ""} ${a.user.lastName || ""}`.trim() || "Unknown",
            action: a.details || a.action,
            time: a.createdAt.toISOString(),
          })),
        });
      }

      const myRecordCount = await prisma.orgProfileData.count({ where: { orgId: resolvedOrgId, createdBy: userId } });
      const myActivityCount = await prisma.activityLog.count({ where: { orgId: resolvedOrgId, userId } });
      const orgMemberCount = await prisma.orgMember.count({ where: { orgId: resolvedOrgId } });
      const lastActivity = await prisma.activityLog.findFirst({
        where: { orgId: resolvedOrgId, userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const myRecords = await prisma.orgProfileData.findMany({
        where: { orgId: resolvedOrgId, createdBy: userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { title: true, createdAt: true },
      });
      const monthlyData = await prisma.$queryRawUnsafe<{ month: string; count: bigint }[]>(`
        SELECT TO_CHAR(created_at, 'Mon') AS month, COUNT(*) AS count
        FROM activity_logs
        WHERE org_id = ${resolvedOrgId} AND user_id = ${userId} AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `);
      return NextResponse.json({
        resolvedOrgId,
        stats: { myRecordCount, myActivityCount, lastActive: lastActivity?.createdAt?.toISOString() || null, orgMemberCount },
        chartData: monthlyData.map((d) => ({ month: d.month, value: Number(d.count) })),
        myRecords: myRecords.map((r) => ({ title: r.title, time: r.createdAt.toISOString() })),
      });
    }

    if (role === "admin") {
      const memberCount = await prisma.orgMember.count({ where: { orgId } });
      const recordCount = await prisma.orgProfileData.count({ where: { orgId } });
      const pendingInvites = await prisma.invitation.count({ where: { orgId, used: false, expiresAt: { gt: new Date() } } });
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activityThisWeek = await prisma.activityLog.count({ where: { orgId, createdAt: { gte: weekAgo } } });
      const recentActivity = await prisma.activityLog.findMany({
        where: { orgId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      const monthlyData = await prisma.$queryRawUnsafe<{ month: string; count: bigint }[]>(`
        SELECT TO_CHAR(created_at, 'Mon') AS month, COUNT(*) AS count
        FROM activity_logs
        WHERE org_id = ${orgId} AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `);
      const memberGrowth = await prisma.$queryRawUnsafe<{ month: string; count: bigint }[]>(`
        SELECT TO_CHAR(created_at, 'Mon') AS month, COUNT(*) AS count
        FROM org_members
        WHERE org_id = ${orgId} AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `);
      return NextResponse.json({
        stats: { memberCount, recordCount, pendingInvites, activityThisWeek },
        chartData: monthlyData.map((d) => ({ month: d.month, value: Number(d.count) })),
        memberGrowth: memberGrowth.map((d) => ({ month: d.month, value: Number(d.count) })),
        recentActivity: recentActivity.map((a) => ({
          name: `${a.user.firstName || ""} ${a.user.lastName || ""}`.trim() || "Unknown",
          action: a.details || a.action,
          time: a.createdAt.toISOString(),
        })),
      });
    }

    const myRecordCount = await prisma.orgProfileData.count({ where: { orgId, createdBy: userId } });
    const myActivityCount = await prisma.activityLog.count({ where: { orgId, userId } });
    const orgMemberCount = await prisma.orgMember.count({ where: { orgId } });
    const lastActivity = await prisma.activityLog.findFirst({
      where: { orgId, userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const myRecords = await prisma.orgProfileData.findMany({
      where: { orgId, createdBy: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { title: true, createdAt: true },
    });
    const monthlyData = await prisma.$queryRawUnsafe<{ month: string; count: bigint }[]>(`
      SELECT TO_CHAR(created_at, 'Mon') AS month, COUNT(*) AS count
      FROM activity_logs
      WHERE org_id = ${orgId} AND user_id = ${userId} AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);
    return NextResponse.json({
      stats: { myRecordCount, myActivityCount, lastActive: lastActivity?.createdAt?.toISOString() || null, orgMemberCount },
      chartData: monthlyData.map((d) => ({ month: d.month, value: Number(d.count) })),
      myRecords: myRecords.map((r) => ({ title: r.title, time: r.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
