import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      orgName: true,
      role: true,
      createdAt: true,
      timezone: true,
      language: true,
      company: true,
      phone: true,
      address1: true,
      address2: true,
      city: true,
      state: true,
      zip: true,
      country: true,
      website: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    org_name: user.orgName,
    role: user.role,
    created_at: user.createdAt,
    timezone: user.timezone,
    language: user.language,
    company: user.company,
    phone: user.phone,
    address1: user.address1,
    address2: user.address2,
    city: user.city,
    state: user.state,
    zip: user.zip,
    country: user.country,
    website: user.website,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = parseInt(session.user.id);

  try {
    const body = await req.json();
    if (!body.first_name || !String(body.first_name).trim()) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: String(body.first_name).trim(),
        lastName: String(body.last_name || "").trim(),
        timezone: body.timezone != null ? String(body.timezone) : undefined,
        language: body.language != null ? String(body.language) : undefined,
        company: body.company != null ? String(body.company) : undefined,
        phone: body.phone != null ? String(body.phone) : undefined,
        address1: body.address1 != null ? String(body.address1) : undefined,
        address2: body.address2 != null ? String(body.address2) : undefined,
        city: body.city != null ? String(body.city) : undefined,
        state: body.state != null ? String(body.state) : undefined,
        zip: body.zip != null ? String(body.zip) : undefined,
        country: body.country != null ? String(body.country) : undefined,
        website: body.website != null ? String(body.website) : undefined,
      },
    });

    await logActivity({ userId, action: "profile.update", details: JSON.stringify({ first_name: String(body.first_name).trim() }) });

    return NextResponse.json({ message: "Profile updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
