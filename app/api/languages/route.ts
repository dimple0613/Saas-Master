import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const activeOnly = req.nextUrl.searchParams.get("active") === "true";

  try {
    const languages = await prisma.language.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      languages: languages.map((l) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        region: l.region,
        isActive: l.isActive,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "languages.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code, name, region, isActive } = await req.json().catch(() => ({}));
  if (!code || !name) return NextResponse.json({ error: "Code and name are required" }, { status: 400 });

  try {
    const existing = await prisma.language.findUnique({ where: { code: String(code).toLowerCase() } });
    if (existing) return NextResponse.json({ error: "A language with this code already exists" }, { status: 409 });

    const language = await prisma.language.create({
      data: {
        code: String(code).toLowerCase(),
        name: String(name),
        region: region ? String(region) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    await logActivity({ userId, action: "language.create", details: JSON.stringify({ code: language.code }) });
    return NextResponse.json({ id: language.id, message: "Language added" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
