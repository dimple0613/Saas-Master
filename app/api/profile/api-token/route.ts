import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { apiTokenHash: true },
  });
  return NextResponse.json({ hasToken: Boolean(user?.apiTokenHash) });
}

// Generate a new API token (old one is immediately invalidated).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);

  const token = `sk_live_${crypto.randomBytes(24).toString("hex")}`;
  await prisma.user.update({
    where: { id: userId },
    data: { apiTokenHash: hashToken(token) },
  });
  await logActivity({ userId, action: "profile.api_token_generated" });
  return NextResponse.json({ token });
}

// Revoke the current API token.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);

  await prisma.user.update({
    where: { id: userId },
    data: { apiTokenHash: null },
  });
  await logActivity({ userId, action: "profile.api_token_revoked" });
  return NextResponse.json({ message: "API token revoked" });
}
