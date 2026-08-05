"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "/admin": "Platform Dashboard",
  "/admin/users": "Users",
  "/admin/accounts": "Accounts",
  "/admin/plans": "Plans & Subscriptions",
  "/admin/profile": "Profile",
  "/app": "My Dashboard",
  "/app/members": "Members",
  "/app/members/add": "Add Member",
  "/app/organizations": "Organizations",
  "/app/settings": "Settings",
  "/app/notifications": "Notifications",
  "/app/profile": "Profile",
};

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === "/") {
    return [{ label: "Home" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];

  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    const isLast = i === segments.length - 1;

    let label = routeLabels[currentPath];
    if (!label) {
      if (currentPath.startsWith("/app/organizations/") && currentPath !== "/app/organizations") {
        label = "Organization Details";
      } else {
        label = segments[i]
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    crumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return crumbs;
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <BreadcrumbItem key={crumb.href ?? crumb.label}>
              {isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <Link href={crumb.href!} className="transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
              {!isLast && <BreadcrumbSeparator />}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
