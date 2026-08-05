import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "languages.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const languageId = parseInt(id);
    const existing = await prisma.language.findUnique({ where: { id: languageId } });
    if (!existing) return NextResponse.json({ error: "Language not found" }, { status: 404 });

    const { code, name, region, isActive } = await req.json().catch(() => ({}));

    if (code && String(code) !== existing.code) {
      const dup = await prisma.language.findUnique({ where: { code: String(code).toLowerCase() } });
      if (dup) return NextResponse.json({ error: "A language with this code already exists" }, { status: 409 });
    }

    const language = await prisma.language.update({
      where: { id: languageId },
      data: {
        code: code ? String(code).toLowerCase() : existing.code,
        name: name !== undefined ? String(name) : existing.name,
        region: region !== undefined ? (region ? String(region) : null) : existing.region,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });
    await logActivity({ userId, action: "language.update", details: JSON.stringify({ code: language.code }) });
    return NextResponse.json({ message: "Language updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "languages.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const languageId = parseInt(id);
    const existing = await prisma.language.findUnique({ where: { id: languageId } });
    if (!existing) return NextResponse.json({ error: "Language not found" }, { status: 404 });

    await prisma.language.delete({ where: { id: languageId } });
    await logActivity({ userId, action: "language.delete", details: JSON.stringify({ code: existing.code }) });
    return NextResponse.json({ message: "Language deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
