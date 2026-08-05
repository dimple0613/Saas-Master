import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: { features: true },
      orderBy: { priceMonthly: "asc" },
    });
    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        priceMonthly: p.priceMonthly.toString(),
        currency: p.currency,
        features: p.features.map((f) => ({ key: f.key, label: f.label, value: f.value })),
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
  if (!(await hasSystemPermission(userId, "plan.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, slug, description, priceMonthly, currency, features } = await req.json();
  if (!name || !slug) return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });

  try {
    const plan = await prisma.plan.create({
      data: {
        name,
        slug,
        description: description || null,
        priceMonthly: priceMonthly ?? 0,
        currency: currency || "USD",
        features: features?.length
          ? { create: features.map((f: { key: string; label?: string; value?: string }) => ({ key: f.key, label: f.label || f.key, value: f.value || null })) }
          : undefined,
      },
    });
    await logActivity({ userId, action: "plan.create", details: JSON.stringify({ slug }) });
    return NextResponse.json({ id: plan.id, message: "Plan created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
