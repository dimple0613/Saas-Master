import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { passwordChangedTemplate } from "@/lib/mail-templates";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    });

    try {
      await sendMail({
        to: user.email,
        subject: "Your password has been changed",
        html: passwordChangedTemplate({ name: user.firstName || user.email }),
      });
    } catch (err) {
      console.error("[reset-password] Failed to send confirmation email:", err);
    }

    return NextResponse.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
