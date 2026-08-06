import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { encode } from "next-auth/jwt";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission, getSystemPermissions } from "@/lib/permissions";
import { hashToken } from "@/lib/tokens";
import { logActivity } from "@/lib/activity";

const SESSION_DAYS = 30;

// Superadmin "Login As": create a fresh signed session for the target user
// and swap it into the browser cookie so they land in that account.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "impersonate"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId: targetId } = await req.json().catch(() => ({}));
  const target = await prisma.user.findUnique({ where: { id: parseInt(String(targetId)) } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.status !== "active") {
    return NextResponse.json({ error: "Cannot log in as a user who is not active" }, { status: 400 });
  }
  if (target.id === userId) {
    return NextResponse.json({ error: "You are already signed in as this user" }, { status: 400 });
  }

  // Reuse the exact cookie name the admin currently has (https vs http prefix).
  const sessionCookieName =
    req.cookies.getAll().find((c) => c.name.includes("authjs.session-token"))?.name ?? "authjs.session-token";

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Auth secret not configured" }, { status: 500 });

  const sid = crypto.randomBytes(32).toString("hex");
  const permissions = await getSystemPermissions(target.id);

  try {
    await prisma.activeSession.create({
      data: {
        userId: target.id,
        tokenHash: hashToken(sid),
        expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    console.error("[impersonate] Failed to create active session:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const token = await encode({
    secret,
    salt: sessionCookieName,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    token: {
      sub: String(target.id),
      name: `${target.firstName || ""} ${target.lastName || ""}`.trim() || target.email,
      email: target.email,
      picture: target.image || null,
      role: target.role,
      id: String(target.id),
      sid,
      permissions,
    },
  });

  await logActivity({
    userId,
    action: "impersonate.login",
    details: JSON.stringify({ target_id: target.id, email: target.email }),
  });

  const response = NextResponse.json({
    message: `Signed in as ${target.email}`,
    redirect: target.kind === "admin" ? "/admin" : "/app",
  });

  response.cookies.set({
    name: sessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: sessionCookieName.startsWith("__Secure-"),
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return response;
}
