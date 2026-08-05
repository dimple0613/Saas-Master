import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

const VALID_SORT_COLUMNS = ["name", "organization", "role", "joined"] as const;
type SortColumn = (typeof VALID_SORT_COLUMNS)[number];

function buildOrderBy(sortBy: SortColumn | null, sortOrder: Prisma.SortOrder): Prisma.UserOrderByWithRelationInput[] {
  if (!sortBy) return [{ createdAt: "desc" }];
  switch (sortBy) {
    case "name":
      return [{ firstName: sortOrder }, { lastName: sortOrder }];
    case "organization":
      return [{ orgName: sortOrder }];
    case "role":
      return [{ role: sortOrder }];
    case "joined":
      return [{ createdAt: sortOrder }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await hasSystemPermission(parseInt(session.user.id), "user.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const sortByParam = url.searchParams.get("sortBy");
  const sortOrderParam = url.searchParams.get("sortOrder");

  const sortBy = sortByParam && VALID_SORT_COLUMNS.includes(sortByParam as SortColumn) ? (sortByParam as SortColumn) : null;
  const sortOrder = sortOrderParam === "asc" ? "asc" : "desc";
  const search = url.searchParams.get("search")?.trim() || null;

  const where: Prisma.UserWhereInput = search ? {
    OR: [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { orgName: { contains: search, mode: "insensitive" } },
      { role: { equals: search.toLowerCase() as "superadmin" | "admin" | "user" } },
    ],
  } : {};

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true, orgName: true, role: true, status: true, createdAt: true },
        where,
        orderBy: buildOrderBy(sortBy, sortOrder),
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);
    return NextResponse.json({ users, total });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
