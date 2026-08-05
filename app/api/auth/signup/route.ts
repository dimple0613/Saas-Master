import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { welcomeTemplate } from "@/lib/mail-templates";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, orgName, password } = await req.json();

    if (!firstName || !lastName || !email || !orgName || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName,
        lastName,
        orgName,
        role: "user",
      },
    });

    try {
      await sendMail({
        to: email,
        subject: `Welcome to ${process.env.APP_NAME || "Acme Inc"}`,
        html: welcomeTemplate({ name: `${firstName} ${lastName}`.trim() || email }, orgName),
      });
    } catch (err) {
      console.error("[signup] Failed to send welcome email:", err);
    }

    return NextResponse.json({ message: "Account created successfully" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
