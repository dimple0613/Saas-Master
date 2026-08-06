import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "subscription.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        org: { select: { id: true, name: true, status: true } },
        plan: { select: { id: true, name: true, slug: true, priceMonthly: true, billingCycle: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        org: s.org,
        plan: {
          id: s.plan.id,
          name: s.plan.name,
          slug: s.plan.slug,
          priceMonthly: Number(s.plan.priceMonthly),
          billingCycle: s.plan.billingCycle,
          currency: s.plan.currency,
        },
        status: s.status,
        autoRenew: s.autoRenew,
        credits: s.credits,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt?.toISOString() || null,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Change an organization's plan.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "plan.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId, planId } = await req.json().catch(() => ({}));
  if (!orgId || !planId) return NextResponse.json({ error: "orgId and planId are required" }, { status: 400 });

  try {
    const plan = await prisma.plan.findUnique({ where: { id: parseInt(planId) } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const subscription = await prisma.subscription.upsert({
      where: { orgId: parseInt(orgId) },
      update: { planId: plan.id, status: "active" },
      create: { orgId: parseInt(orgId), planId: plan.id, status: "active" },
    });
    await logActivity({ userId, action: "subscription.plan_change", details: JSON.stringify({ org_id: parseInt(orgId), plan_id: plan.id }) });
    return NextResponse.json({ id: subscription.id, message: `Organization moved to ${plan.name}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
