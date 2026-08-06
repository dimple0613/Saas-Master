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
  if (!(await hasSystemPermission(userId, "template.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const templateId = parseInt(id);
    const existing = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const { name, slug, category, html, isActive } = await req.json().catch(() => ({}));
    if (slug !== undefined) {
      const dup = await prisma.emailTemplate.findUnique({ where: { slug: String(slug) } });
      if (dup && dup.id !== templateId) return NextResponse.json({ error: "A template with this slug already exists" }, { status: 409 });
    }

    await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        name: name !== undefined ? String(name) : existing.name,
        slug: slug !== undefined ? String(slug) : existing.slug,
        category: category !== undefined ? String(category) : existing.category,
        html: html !== undefined ? (html ? String(html) : null) : existing.html,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });
    await logActivity({ userId, action: "template.update", details: JSON.stringify({ id: templateId }) });
    return NextResponse.json({ message: "Template updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "template.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const templateId = parseInt(id);
    const existing = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    await prisma.emailTemplate.delete({ where: { id: templateId } });
    await logActivity({ userId, action: "template.delete", details: JSON.stringify({ name: existing.name }) });
    return NextResponse.json({ message: "Template deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
