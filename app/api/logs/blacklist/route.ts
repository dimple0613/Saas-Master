import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "log.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const entries = await prisma.blacklist.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
    return NextResponse.json({
      entries: entries.map((b) => ({
        id: b.id,
        emailOrDomain: b.emailOrDomain,
        reason: b.reason,
        createdAt: b.createdAt.toISOString(),
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
  if (!(await hasSystemPermission(userId, "log.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { emailOrDomain, reason } = await req.json().catch(() => ({}));
  const value = String(emailOrDomain || "").trim().toLowerCase();
  if (!value) return NextResponse.json({ error: "Email or domain is required" }, { status: 400 });

  try {
    const existing = await prisma.blacklist.findUnique({ where: { emailOrDomain: value } });
    if (existing) return NextResponse.json({ error: "This email or domain is already blacklisted" }, { status: 409 });

    const entry = await prisma.blacklist.create({
      data: { emailOrDomain: value, reason: reason ? String(reason) : null },
    });
    await logActivity({ userId, action: "blacklist.add", details: JSON.stringify({ email_or_domain: value }) });
    return NextResponse.json({ id: entry.id, message: "Added to blacklist" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
