"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isSuperadmin = session?.user?.role === "superadmin";
  const isMembersRoute = pathname.startsWith("/app/members");

  useEffect(() => {
    if (status !== "loading" && isSuperadmin && !isMembersRoute) {
      router.replace("/admin");
    }
  }, [status, isSuperadmin, isMembersRoute, router]);

  if (status === "loading") {
    return null;
  }

  if (isSuperadmin && !isMembersRoute) {
    return null;
  }

  return <>{children}</>;
}
