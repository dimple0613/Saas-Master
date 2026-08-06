import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const packages = await prisma.creditPackage.findMany({ orderBy: { credits: "asc" } });
    return NextResponse.json({
      packages: packages.map((p) => ({
        id: p.id,
        name: p.name,
        credits: p.credits,
        price: p.price.toString(),
        isVisible: p.isVisible,
        isActive: p.isActive,
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
  if (!(await hasSystemPermission(userId, "credit.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, credits, price, isVisible, isActive } = await req.json().catch(() => ({}));
  const creditsNum = parseInt(String(credits));
  if (!name || Number.isNaN(creditsNum) || creditsNum < 0) {
    return NextResponse.json({ error: "Valid name and credits are required" }, { status: 400 });
  }
  const priceNum = parseFloat(String(price));
  if (Number.isNaN(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
  }

  try {
    const pkg = await prisma.creditPackage.create({
      data: {
        name: String(name),
        credits: creditsNum,
        price: priceNum,
        isVisible: isVisible !== undefined ? Boolean(isVisible) : true,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    await logActivity({ userId, action: "credit.create", details: JSON.stringify({ name: pkg.name, credits: pkg.credits }) });
    return NextResponse.json({ id: pkg.id, message: "Credit package added" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
