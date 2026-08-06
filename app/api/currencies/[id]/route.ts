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
  if (!(await hasSystemPermission(userId, "currency.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const currencyId = parseInt(id);
    const existing = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!existing) return NextResponse.json({ error: "Currency not found" }, { status: 404 });

    const { name, code, symbol, format, isActive } = await req.json().catch(() => ({}));

    if (code && String(code).toUpperCase() !== existing.code) {
      const dup = await prisma.currency.findUnique({ where: { code: String(code).toUpperCase() } });
      if (dup) return NextResponse.json({ error: "A currency with this code already exists" }, { status: 409 });
    }

    const currency = await prisma.currency.update({
      where: { id: currencyId },
      data: {
        name: name !== undefined ? String(name) : existing.name,
        code: code !== undefined ? String(code).toUpperCase() : existing.code,
        symbol: symbol !== undefined ? (symbol ? String(symbol) : null) : existing.symbol,
        format: format !== undefined ? (format ? String(format) : null) : existing.format,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });
    await logActivity({ userId, action: "currency.update", details: JSON.stringify({ code: currency.code }) });
    return NextResponse.json({ message: "Currency updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "currency.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const currencyId = parseInt(id);
    const existing = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!existing) return NextResponse.json({ error: "Currency not found" }, { status: 404 });

    await prisma.currency.delete({ where: { id: currencyId } });
    await logActivity({ userId, action: "currency.delete", details: JSON.stringify({ code: existing.code }) });
    return NextResponse.json({ message: "Currency deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
