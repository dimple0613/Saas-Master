import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { emailNotifications: true, securityAlerts: true, marketingEmails: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    email_notifications: user.emailNotifications !== null ? !!user.emailNotifications : true,
    security_alerts: user.securityAlerts !== null ? !!user.securityAlerts : true,
    marketing_emails: !!user.marketingEmails,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { email_notifications, security_alerts, marketing_emails } = await req.json();
    await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: {
        emailNotifications: email_notifications,
        securityAlerts: security_alerts,
        marketingEmails: marketing_emails,
      },
    });
    return NextResponse.json({ message: "Preferences saved" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
