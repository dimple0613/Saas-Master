import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSystemPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { UserKind, UserStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "user.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim() || null;

  const where: Prisma.UserWhereInput = {
    kind: UserKind.customer,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { orgName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const customers = await prisma.user.findMany({
      where,
      include: {
        ownedOrgs: {
          include: {
            subscription: {
              include: {
                plan: { select: { id: true, name: true, slug: true, priceMonthly: true } },
              },
            },
          },
        },
        orgMemberships: {
          include: {
            org: {
              include: {
                subscription: {
                  include: {
                    plan: { select: { id: true, name: true, slug: true, priceMonthly: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      customers: customers.map((c) => {
        const sub = c.ownedOrgs.map((o) => o.subscription).find(Boolean) ??
          c.orgMemberships.map((m) => m.org.subscription).find(Boolean) ??
          null;
        return {
          id: c.id,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          image: c.image,
          status: c.status,
          timezone: c.timezone,
          language: c.language,
          company: c.company,
          orgName: c.orgName,
          createdAt: c.createdAt.toISOString(),
          subscription: sub
            ? {
                id: sub.id,
                planName: sub.plan.name,
                planPrice: Number(sub.plan.priceMonthly),
                status: sub.status,
                autoRenew: sub.autoRenew,
                credits: sub.credits,
                subscribers: sub.subscribers,
                endsAt: sub.endsAt?.toISOString() || null,
              }
            : null,
        };
      }),
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
  if (!(await hasSystemPermission(userId, "user.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, firstName, lastName, password, timezone, language, company } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  try {
    const existing = await prisma.user.findUnique({ where: { email: String(email) } });
    if (existing) return NextResponse.json({ error: "A customer with this email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const customer = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: passwordHash,
        firstName: firstName ? String(firstName) : null,
        lastName: lastName ? String(lastName) : null,
        kind: UserKind.customer,
        timezone: timezone ? String(timezone) : "UTC",
        language: language ? String(language) : "en",
        company: company ? String(company) : null,
      },
    });
    await logActivity({ userId, action: "customer.create", details: JSON.stringify({ customer_id: customer.id, email: customer.email }) });
    return NextResponse.json({ id: customer.id, message: "Customer created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);
  if (!(await hasSystemPermission(userId, "user.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  if (!["active", "inactive", "suspended"].includes(String(status))) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const customer = await prisma.user.findUnique({ where: { id: parseInt(String(id)) } });
    if (!customer || customer.kind !== UserKind.customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    await prisma.user.update({
      where: { id: customer.id },
      data: { status: status as UserStatus },
    });
    await logActivity({ userId, action: "customer.status_change", details: JSON.stringify({ customer_id: customer.id, status }) });
    return NextResponse.json({ message: "Customer updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
