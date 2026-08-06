import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const gateways = await prisma.paymentGateway.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({
      gateways: gateways.map((g) => ({
        id: g.id,
        name: g.name,
        type: g.type,
        config: g.config,
        isActive: g.isActive,
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
  if (!(await hasSystemPermission(userId, "gateway.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, type, config, isActive } = await req.json().catch(() => ({}));
  if (!name || !type) return NextResponse.json({ error: "Name and type are required" }, { status: 400 });

  try {
    const gateway = await prisma.paymentGateway.create({
      data: {
        name: String(name),
        type: String(type).toLowerCase(),
        config: config ? config : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    await logActivity({ userId, action: "gateway.create", details: JSON.stringify({ name: gateway.name }) });
    return NextResponse.json({ id: gateway.id, message: "Gateway added" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
