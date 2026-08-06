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
  if (!(await hasSystemPermission(userId, "credit.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const pkgId = parseInt(id);
    const existing = await prisma.creditPackage.findUnique({ where: { id: pkgId } });
    if (!existing) return NextResponse.json({ error: "Credit package not found" }, { status: 404 });

    const { name, credits, price, isVisible, isActive } = await req.json().catch(() => ({}));

    const creditsNum = credits !== undefined ? parseInt(String(credits)) : existing.credits;
    const priceNum = price !== undefined ? parseFloat(String(price)) : parseFloat(existing.price.toString());

    if (Number.isNaN(creditsNum) || creditsNum < 0 || Number.isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "Invalid credits or price" }, { status: 400 });
    }

    const pkg = await prisma.creditPackage.update({
      where: { id: pkgId },
      data: {
        name: name !== undefined ? String(name) : existing.name,
        credits: creditsNum,
        price: priceNum,
        isVisible: isVisible !== undefined ? Boolean(isVisible) : existing.isVisible,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });
    await logActivity({ userId, action: "credit.update", details: JSON.stringify({ name: pkg.name }) });
    return NextResponse.json({ message: "Credit package updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "credit.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const pkgId = parseInt(id);
    const existing = await prisma.creditPackage.findUnique({ where: { id: pkgId } });
    if (!existing) return NextResponse.json({ error: "Credit package not found" }, { status: 404 });

    await prisma.creditPackage.delete({ where: { id: pkgId } });
    await logActivity({ userId, action: "credit.delete", details: JSON.stringify({ name: existing.name }) });
    return NextResponse.json({ message: "Credit package deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
