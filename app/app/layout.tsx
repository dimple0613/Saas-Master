import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { TenantShell } from "@/components/tenant-shell";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user?.role === "superadmin") {
    redirect("/admin");
  }

  return (
    <SessionProvider session={session}>
      <TenantShell>{children}</TenantShell>
    </SessionProvider>
  );
}
