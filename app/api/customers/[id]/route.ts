import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { UserKind, UserStatus } from "@prisma/client";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "user.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const existing = await prisma.user.findUnique({ where: { id: customerId } });
    if (!existing || existing.kind !== UserKind.customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { email, firstName, lastName, password, timezone, language, company, status } = await req.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    if (email !== undefined) {
      const normalized = String(email).toLowerCase();
      const dup = await prisma.user.findUnique({ where: { email: normalized } });
      if (dup && dup.id !== customerId) return NextResponse.json({ error: "A customer with this email already exists" }, { status: 409 });
      data.email = normalized;
    }
    if (firstName !== undefined) data.firstName = firstName ? String(firstName) : null;
    if (lastName !== undefined) data.lastName = lastName ? String(lastName) : null;
    if (password) data.password = await bcrypt.hash(String(password), 10);
    if (timezone !== undefined) data.timezone = timezone ? String(timezone) : null;
    if (language !== undefined) data.language = language ? String(language) : null;
    if (company !== undefined) data.company = company ? String(company) : null;
    if (status !== undefined) {
      if (!["active", "inactive", "suspended"].includes(String(status))) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = status as UserStatus;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: customerId }, data });
    await logActivity({ userId, action: "customer.update", details: JSON.stringify({ customer_id: customerId }) });
    return NextResponse.json({ message: "Customer updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "user.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const existing = await prisma.user.findUnique({ where: { id: customerId } });
    if (!existing || existing.kind !== UserKind.customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: customerId },
      data: { status: UserStatus.inactive },
    });
    await logActivity({ userId, action: "customer.delete", details: JSON.stringify({ customer_id: customerId, email: existing.email }) });
    return NextResponse.json({ message: "Customer disabled" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
