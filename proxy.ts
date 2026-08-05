import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/invite", "/terms", "/privacy"];

// System-scope routes guarded by permission keys embedded in the JWT.
const guardedRoutes: { path: string; permission: string }[] = [
  { path: "/admin", permission: "user.manage" },
];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));
  const isApiRoute = pathname.startsWith("/api");

  if (isApiRoute || isAuthRoute) return NextResponse.next();

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user?.role || "user";
  const permissions: string[] = session.user?.permissions || [];

  // Legacy shared /profile route is now area-specific.
  if (pathname === "/profile") {
    return NextResponse.redirect(
      new URL(permissions.includes("user.manage") ? "/admin/profile" : "/app/profile", req.url)
    );
  }

  // System Admin area requires the user.manage permission.
  const guarded = guardedRoutes.find((g) => pathname.startsWith(g.path));
  if (guarded) {
    if (!permissions.includes(guarded.permission)) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    return NextResponse.next();
  }

  // Superadmins don't use the tenant-facing pages.
  if (pathname.startsWith("/app") && role === "superadmin") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
