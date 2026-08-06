import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const currencies = await prisma.currency.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({
      currencies: currencies.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        symbol: c.symbol,
        format: c.format,
        isActive: c.isActive,
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
  if (!(await hasSystemPermission(userId, "currency.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, code, symbol, format, isActive } = await req.json().catch(() => ({}));
  if (!name || !code) return NextResponse.json({ error: "Name and code are required" }, { status: 400 });

  try {
    const existing = await prisma.currency.findUnique({ where: { code: String(code).toUpperCase() } });
    if (existing) return NextResponse.json({ error: "A currency with this code already exists" }, { status: 409 });

    const currency = await prisma.currency.create({
      data: {
        name: String(name),
        code: String(code).toUpperCase(),
        symbol: symbol ? String(symbol) : null,
        format: format ? String(format) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    await logActivity({ userId, action: "currency.create", details: JSON.stringify({ code: currency.code }) });
    return NextResponse.json({ id: currency.id, message: "Currency added" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
