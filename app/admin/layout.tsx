import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { AdminShell } from "@/components/admin-shell";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const permissions: string[] = session.user?.permissions || [];
  if (!permissions.includes("user.manage")) {
    redirect("/app");
  }

  return (
    <SessionProvider session={session}>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
