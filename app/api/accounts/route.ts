import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await hasSystemPermission(parseInt(session.user.id), "subscription.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: { include: { plan: { select: { name: true, slug: true, priceMonthly: true } } } },
      },
    });

    const ownerIds = [...new Set(orgs.map((o) => o.ownerUserId))];
    const owners = await prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    const orgCounts = await prisma.orgMember.groupBy({
      by: ["orgId"],
      _count: { id: true },
    });
    const countMap = new Map(orgCounts.map((c) => [c.orgId, c._count.id]));

    const result = orgs.map((org) => {
      const owner = ownerMap.get(org.ownerUserId);
      return {
        id: org.id,
        name: org.name,
        description: org.description,
        status: org.status,
        created_at: org.createdAt,
        owner: owner
          ? { id: owner.id, email: owner.email, first_name: owner.firstName, last_name: owner.lastName }
          : null,
        member_count: (countMap.get(org.id) || 0) + 1,
        subscription: org.subscription
          ? {
              status: org.subscription.status,
              plan: org.subscription.plan,
              ends_at: org.subscription.endsAt,
            }
          : null,
      };
    });

    return NextResponse.json({ orgs: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
