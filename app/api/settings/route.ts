import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const settings = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({
      settings: settings.map((s) => ({ key: s.key, value: s.value })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "system.settings"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { settings } = await req.json().catch(() => ({ settings: [] as { key: string; value: string }[] }));
  if (!Array.isArray(settings) || !settings.length) {
    return NextResponse.json({ error: "No settings provided" }, { status: 400 });
  }

  try {
    for (const { key, value } of settings) {
      if (!key) continue;
      await prisma.appSetting.upsert({
        where: { key: String(key) },
        update: { value: value != null ? String(value) : null },
        create: { key: String(key), value: value != null ? String(value) : null },
      });
    }
    await logActivity({ userId, action: "settings.update", details: JSON.stringify({ keys: settings.map((s) => s.key) }) });
    return NextResponse.json({ message: "Settings updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
