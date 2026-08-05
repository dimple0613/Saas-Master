import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = parseInt(session.user.id);

  try {
    const owned = await prisma.organization.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
    });

    const memberOfRaw = await prisma.orgMember.findMany({
      where: { userId },
      include: { org: true },
      orderBy: { createdAt: "desc" },
    });

    const memberOf = memberOfRaw.map((m) => ({
      ...m.org,
      member_role: m.role,
    }));

    const allOrgIds = [
      ...owned.map((o) => o.id),
      ...memberOf.map((o) => o.id),
    ];

    const uniqueOrgIds = [...new Set(allOrgIds)];

    const allMembers = await prisma.orgMember.findMany({
      where: { orgId: { in: uniqueOrgIds } },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });

    const membersByOrg: Record<number, { member_id: number; role: string; user_id: number; email: string; first_name: string; last_name: string }[]> = {};
    for (const m of allMembers) {
      if (!membersByOrg[m.orgId]) membersByOrg[m.orgId] = [];
      membersByOrg[m.orgId].push({
        member_id: m.id,
        role: m.role,
        user_id: m.user.id,
        email: m.user.email,
        first_name: m.user.firstName || "",
        last_name: m.user.lastName || "",
      });
    }

    const owners = await prisma.user.findMany({
      where: { id: { in: owned.map((o) => o.ownerUserId) } },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    const orgsWithMembers = [
      ...owned.map((org) => {
        const owner = ownerMap.get(org.ownerUserId);
        return {
          id: org.id,
          name: org.name,
          description: org.description,
          myRole: "owner" as const,
          owner: owner ? { id: owner.id, email: owner.email, first_name: owner.firstName, last_name: owner.lastName } : null,
          members: membersByOrg[org.id] || [],
        };
      }),
      ...memberOf.map((org) => ({
        id: org.id,
        name: org.name,
        description: org.description,
        myRole: org.member_role,
        owner: null as { id: number; email: string; first_name: string; last_name: string } | null,
        members: membersByOrg[org.id] || [],
      })),
    ];

    return NextResponse.json({ orgs: orgsWithMembers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
