import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasSystemPermission, SYSTEM_PERMISSIONS, TENANT_PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await hasSystemPermission(parseInt(session.user.id), "roles.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    permissions: {
      system: SYSTEM_PERMISSIONS.map((p) => ({ key: p.key, label: p.label })),
      tenant: TENANT_PERMISSIONS.map((p) => ({ key: p.key, label: p.label })),
    },
  });
}
