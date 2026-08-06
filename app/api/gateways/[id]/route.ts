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
  if (!(await hasSystemPermission(userId, "gateway.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const gatewayId = parseInt(id);
    const existing = await prisma.paymentGateway.findUnique({ where: { id: gatewayId } });
    if (!existing) return NextResponse.json({ error: "Gateway not found" }, { status: 404 });

    const { name, type, config, isActive } = await req.json().catch(() => ({}));

    const gateway = await prisma.paymentGateway.update({
      where: { id: gatewayId },
      data: {
        name: name !== undefined ? String(name) : existing.name,
        type: type !== undefined ? String(type).toLowerCase() : existing.type,
        config: config !== undefined ? config : existing.config,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });
    await logActivity({ userId, action: "gateway.update", details: JSON.stringify({ name: gateway.name }) });
    return NextResponse.json({ message: "Gateway updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "gateway.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const gatewayId = parseInt(id);
    const existing = await prisma.paymentGateway.findUnique({ where: { id: gatewayId } });
    if (!existing) return NextResponse.json({ error: "Gateway not found" }, { status: 404 });

    await prisma.paymentGateway.delete({ where: { id: gatewayId } });
    await logActivity({ userId, action: "gateway.delete", details: JSON.stringify({ name: existing.name }) });
    return NextResponse.json({ message: "Gateway deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
