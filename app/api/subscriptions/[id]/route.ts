import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

interface Ctx {
  params: Promise<{ id: string }>;
}

// Update subscription status / auto-renewal.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "subscription.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const subId = parseInt(id);
    const existing = await prisma.subscription.findUnique({ where: { id: subId } });
    if (!existing) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    const { status, autoRenew, credits } = await req.json().catch(() => ({}));

    const subscription = await prisma.subscription.update({
      where: { id: subId },
      data: {
        status: status !== undefined ? status : existing.status,
        autoRenew: autoRenew !== undefined ? Boolean(autoRenew) : existing.autoRenew,
        credits: credits !== undefined ? parseInt(String(credits)) : existing.credits,
      },
    });
    await logActivity({
      userId,
      action: "subscription.update",
      details: JSON.stringify({ subscription_id: subId, status: subscription.status, auto_renew: subscription.autoRenew }),
    });
    return NextResponse.json({ message: "Subscription updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
