import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import type { Provider } from "next-auth/providers";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { Prisma } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSystemPermissions } from "@/lib/permissions";
import { hashToken } from "@/lib/tokens";

const SESSION_DAYS = 30;
const SESSION_DURATION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

// Split a full name (OAuth) into first/last for the existing schema.
function nameParts(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || null };
}

interface AuthUserInput {
  id?: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null;
  image?: string | null;
}

function toCreateData(user: AuthUserInput): Prisma.UserCreateInput {
  return {
    email: user.email ?? "",
    ...nameParts(user.name),
    ...(user.emailVerified ? { emailVerified: user.emailVerified } : {}),
    ...(user.image ? { image: user.image } : {}),
  };
}

function toUpdateData(user: AuthUserInput): Prisma.UserUpdateInput {
  return {
    ...(user.email ? { email: user.email } : {}),
    ...nameParts(user.name),
    ...(user.emailVerified ? { emailVerified: user.emailVerified } : {}),
    ...(user.image ? { image: user.image } : {}),
  };
}

// The Prisma schema uses firstName/lastName instead of Auth.js `name`, so map it.
// The adapter's createUser/updateUser return the app's Prisma User (numeric id),
// so cast to Adapter to satisfy Auth.js's string-based User type.
const adapter: Adapter = {
  ...PrismaAdapter(prisma),
  createUser: (async (user) =>
    prisma.user.create({ data: toCreateData(user) }) as unknown as AdapterUser
  ) as Adapter["createUser"],
  updateUser: (async (user) =>
    prisma.user.update({ where: { id: Number(user.id) }, data: toUpdateData(user) }) as unknown as AdapterUser
  ) as Adapter["updateUser"],
};

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user) return null;
      if (!user.password) return null; // OAuth-only account
      if (user.status !== "active") return null; // suspended/inactive

      const valid = await bcrypt.compare(credentials.password as string, user.password);
      if (!valid) return null;

      return {
        id: String(user.id),
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        role: user.role,
      };
    },
  }),
];

// Google / Apple OAuth (only registered when env vars are configured).
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}
if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || "user";
        token.id = user.id;

        // Track this login so it can be viewed/revoked via session management.
        const sid = crypto.randomBytes(32).toString("hex");
        token.sid = sid;

        // Embed system-scope permissions so middleware can authorize without a DB call.
        try {
          token.permissions = await getSystemPermissions(parseInt(String(user.id)));
        } catch (err) {
          console.error("[auth] Failed to load permissions:", err);
          token.permissions = [];
        }

        try {
          await prisma.activeSession.create({
            data: {
              userId: parseInt(String(user.id)),
              tokenHash: hashToken(sid),
              expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
            },
          });
        } catch (err) {
          console.error("[auth] Failed to create active session:", err);
        }
      } else if (token.sid && token.id) {
        // Validate the tracked session + user status on every request.
        try {
          const active = await prisma.activeSession.findUnique({
            where: { tokenHash: hashToken(token.sid as string) },
            include: { user: { select: { status: true } } },
          });

          const expired = !active || active.revokedAt !== null || active.expiresAt < new Date();
          const suspended = active?.user.status && active.user.status !== "active";

          if (expired || suspended) {
            throw new Error("Session is no longer valid");
          }

          const now = Date.now();
          if (!active.lastSeenAt || now - active.lastSeenAt.getTime() > 5 * 60 * 1000) {
            await prisma.activeSession
              .update({ where: { id: active.id }, data: { lastSeenAt: new Date() } })
              .catch(() => {});
          }
        } catch (err) {
          if (err instanceof Error && err.message === "Session is no longer valid") {
            throw err;
          }
          console.error("[auth] Session validation error:", err);
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || "user";
        session.user.permissions = (token.permissions as string[]) || [];
        session.user.sid = (token.sid as string) || undefined;
      }
      return session;
    },
  },
});
