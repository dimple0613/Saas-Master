import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(id) },
      include: { features: true },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        priceMonthly: plan.priceMonthly.toString(),
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        trialDays: plan.trialDays,
        requiresPayment: plan.requiresPayment,
        isActive: plan.isActive,
        features: plan.features.map((f) => ({ key: f.key, label: f.label, value: f.value })),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "plan.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const planId = parseInt(id);
    const existing = await prisma.plan.findUnique({ where: { id: planId } });
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const { name, slug, description, priceMonthly, currency, billingCycle, trialDays, requiresPayment, isActive, features } = await req.json();

    if (slug && slug !== existing.slug) {
      const dup = await prisma.plan.findUnique({ where: { slug } });
      if (dup) return NextResponse.json({ error: "A plan with this slug already exists" }, { status: 409 });
    }

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: {
        name: name !== undefined ? name : existing.name,
        slug: slug !== undefined ? slug : existing.slug,
        description: description !== undefined ? description || null : existing.description,
        priceMonthly: priceMonthly !== undefined ? priceMonthly : existing.priceMonthly,
        currency: currency !== undefined ? currency : existing.currency,
        billingCycle: billingCycle !== undefined ? (billingCycle === "yearly" ? "yearly" : "monthly") : existing.billingCycle,
        trialDays: trialDays !== undefined ? (trialDays == null ? null : parseInt(trialDays)) : existing.trialDays,
        requiresPayment: requiresPayment !== undefined ? Boolean(requiresPayment) : existing.requiresPayment,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    if (features && Array.isArray(features)) {
      await prisma.planFeature.deleteMany({ where: { planId } });
      if (features.length) {
        await prisma.planFeature.createMany({
          data: features.map((f: { key: string; label?: string; value?: string }) => ({
            planId,
            key: f.key,
            label: f.label || f.key,
            value: f.value || null,
          })),
        });
      }
    }

    await logActivity({ userId, action: "plan.update", details: JSON.stringify({ id: planId }) });
    return NextResponse.json({ id: plan.id, message: "Plan updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "plan.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const planId = parseInt(id);

    const inUse = await prisma.subscription.count({ where: { planId } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `This plan is used by ${inUse} subscription(s) and cannot be deleted. Set it to inactive instead.` },
        { status: 409 }
      );
    }

    await prisma.plan.delete({ where: { id: planId } });
    await logActivity({ userId, action: "plan.delete", details: JSON.stringify({ id: planId }) });
    return NextResponse.json({ message: "Plan deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
