import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { TenantShell } from "@/components/tenant-shell";
import { AppRouteGuard } from "@/components/app-route-guard";
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

  return (
    <SessionProvider session={session}>
      <AppRouteGuard>
        <TenantShell>{children}</TenantShell>
      </AppRouteGuard>
    </SessionProvider>
  );
}
