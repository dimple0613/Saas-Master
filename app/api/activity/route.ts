import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const CATEGORY_MAP: Record<string, string[]> = {
  "add_record": ["data.create"],
  "edit_record": ["data.update"],
  "delete_record": ["data.delete"],
  "user_created": ["auth.signup"],
  "permission_change": ["user.role_change", "member.role_change"],
  "member_activity": ["member.remove", "member.invite"],
  "profile_update": ["profile.update", "password.change"],
};

const CATEGORY_LABELS: Record<string, string> = {
  add_record: "Add Record",
  edit_record: "Edit Record",
  delete_record: "Delete Record",
  user_created: "User Created",
  permission_change: "Permission Change",
  member_activity: "Member Activity",
  profile_update: "Profile Update",
};

const VALID_SORT_COLUMNS = ["user", "activity", "category", "organization", "date"] as const;
type SortColumn = (typeof VALID_SORT_COLUMNS)[number];

function buildOrderBy(sortBy: SortColumn | null, sortOrder: Prisma.SortOrder): Prisma.ActivityLogOrderByWithRelationInput[] {
  if (!sortBy) return [{ createdAt: "desc" }];
  switch (sortBy) {
    case "user":
      return [{ user: { firstName: sortOrder } }];
    case "activity":
      return [{ details: sortOrder }];
    case "category":
      return [{ action: sortOrder }];
    case "organization":
      return [{ org: { name: sortOrder } }];
    case "date":
      return [{ createdAt: sortOrder }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id");
  const category = url.searchParams.get("category");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const sortByParam = url.searchParams.get("sortBy");
  const sortOrderParam = url.searchParams.get("sortOrder");

  const sortBy = sortByParam && VALID_SORT_COLUMNS.includes(sortByParam as SortColumn) ? (sortByParam as SortColumn) : null;
  const sortOrder = sortOrderParam === "asc" ? "asc" : "desc";

  let where: Prisma.ActivityLogWhereInput;

  if (orgId) {
    where = { orgId: parseInt(orgId) };
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    let orgIds: number[];
    if (user?.role === "superadmin") {
      const allOrgs = await prisma.organization.findMany({ select: { id: true } });
      orgIds = allOrgs.map((o) => o.id);
    } else {
      const memberships = await prisma.orgMember.findMany({
        where: { userId },
        select: { orgId: true },
      });
      const ownedOrgs = await prisma.organization.findMany({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      orgIds = [...new Set([...memberships.map((m) => m.orgId), ...ownedOrgs.map((o) => o.id)])];
    }

    where = {
      OR: [
        { orgId: { in: orgIds } },
        { orgId: null },
      ],
    };
  }

  if (category && CATEGORY_MAP[category]) {
    where.action = { in: CATEGORY_MAP[category] };
  }

  const search = url.searchParams.get("search")?.trim() || null;
  if (search) {
    const matchingActions = Object.entries(CATEGORY_MAP)
      .filter(([key]) => key.includes(search.toLowerCase()) || CATEGORY_LABELS[key]?.toLowerCase().includes(search.toLowerCase()))
      .flatMap(([, actions]) => actions);

    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { user: { firstName: { contains: search, mode: "insensitive" } } },
          { user: { lastName: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
          { action: { contains: search, mode: "insensitive" } },
          { details: { contains: search, mode: "insensitive" } },
          { org: { name: { contains: search, mode: "insensitive" } } },
          ...(matchingActions.length > 0 ? [{ action: { in: matchingActions } }] : []),
        ],
      },
    ];
  }

  try {
    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          org: { select: { name: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        category: Object.entries(CATEGORY_MAP).find(([, actions]) => actions.includes(log.action))?.[0] || "other",
        details: log.details ? (() => { try { return JSON.parse(log.details); } catch { return log.details; } })() : null,
        created_at: log.createdAt,
        user: {
          first_name: log.user.firstName,
          last_name: log.user.lastName,
          email: log.user.email,
        },
        org: log.org ? { name: log.org.name } : null,
      })),
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error("Activity query error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
