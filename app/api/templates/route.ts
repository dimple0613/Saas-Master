import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const templates = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        category: t.category,
        isActive: t.isActive,
        updatedAt: t.updatedAt.toISOString(),
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
  if (!(await hasSystemPermission(userId, "template.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, slug, category, html, isActive } = await req.json().catch(() => ({}));
  if (!name || !slug) return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });

  try {
    const existing = await prisma.emailTemplate.findUnique({ where: { slug: String(slug) } });
    if (existing) return NextResponse.json({ error: "A template with this slug already exists" }, { status: 409 });

    const template = await prisma.emailTemplate.create({
      data: {
        name: String(name),
        slug: String(slug),
        category: category ? String(category) : "base",
        html: html ? String(html) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    await logActivity({ userId, action: "template.create", details: JSON.stringify({ name: template.name, slug: template.slug }) });
    return NextResponse.json({ id: template.id, message: "Template created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
