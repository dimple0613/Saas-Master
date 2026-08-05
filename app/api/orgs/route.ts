import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = parseInt(session.user.id);

  try {
    const owned = await prisma.organization.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
    });

    const memberOfRaw = await prisma.orgMember.findMany({
      where: { userId },
      include: { org: true },
      orderBy: { createdAt: "desc" },
    });

    const memberOf = memberOfRaw.map((m) => ({
      ...m.org,
      member_role: m.role,
    }));

    return NextResponse.json({ owned, memberOf });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.user.role === "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Organization name is required" }, { status: 400 });

  try {
    const org = await prisma.organization.create({
      data: { name, description: description || null, ownerUserId: parseInt(session.user.id) },
    });
    return NextResponse.json({ id: org.id, message: "Organization created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
