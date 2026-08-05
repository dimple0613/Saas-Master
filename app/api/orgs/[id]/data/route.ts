import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { getOrgMembership, hasTenantPermission } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

const VALID_SORT_COLUMNS = ["title", "content", "createdBy", "date"] as const;
type SortColumn = (typeof VALID_SORT_COLUMNS)[number];

function buildOrderBy(sortBy: SortColumn | null, sortOrder: Prisma.SortOrder): Prisma.OrgProfileDataOrderByWithRelationInput[] {
  if (!sortBy) return [{ createdAt: "desc" }];
  switch (sortBy) {
    case "title":
      return [{ title: sortOrder }];
    case "content":
      return [{ content: sortOrder }];
    case "createdBy":
      return [{ creator: { firstName: sortOrder } }];
    case "date":
      return [{ createdAt: sortOrder }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const membership = await getOrgMembership(orgId, userId);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const sortByParam = url.searchParams.get("sortBy");
  const sortOrderParam = url.searchParams.get("sortOrder");

  const sortBy = sortByParam && VALID_SORT_COLUMNS.includes(sortByParam as SortColumn) ? (sortByParam as SortColumn) : null;
  const sortOrder = sortOrderParam === "asc" ? "asc" : "desc";
  const search = url.searchParams.get("search")?.trim() || null;

  const where: Prisma.OrgProfileDataWhereInput = { orgId };
  if (search) {
    const dateMatch = new Date(search);
    const isDate = !isNaN(dateMatch.getTime());
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
      { creator: { firstName: { contains: search, mode: "insensitive" } } },
      { creator: { lastName: { contains: search, mode: "insensitive" } } },
      ...(isDate ? [{ createdAt: { gte: new Date(dateMatch.getFullYear(), dateMatch.getMonth(), dateMatch.getDate()), lt: new Date(dateMatch.getFullYear(), dateMatch.getMonth(), dateMatch.getDate() + 1) } }] : []),
    ];
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.orgProfileData.findMany({
        where,
        include: { creator: { select: { firstName: true, lastName: true } } },
        orderBy: buildOrderBy(sortBy, sortOrder),
        take: limit,
        skip: offset,
      }),
      prisma.orgProfileData.count({ where }),
    ]);

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        created_at: r.createdAt.toISOString(),
        first_name: r.creator?.firstName || null,
        last_name: r.creator?.lastName || null,
      })),
      total,
      myRole: membership.role,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const orgId = parseInt(id);
  const userId = parseInt(session.user.id);

  const membership = await getOrgMembership(orgId, userId);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const canWrite = await hasTenantPermission(userId, orgId, "org.data");
  if (!canWrite) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const { title, content } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  try {
    const row = await prisma.orgProfileData.create({
      data: { orgId, title, content: content || null, createdBy: userId },
    });
    await logActivity({ userId, orgId, action: "data.create", details: JSON.stringify({ title }) });
    return NextResponse.json({ id: row.id, message: "Row created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
