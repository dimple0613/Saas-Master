"use client";

import { UserStats } from "@/components/dashboard/user-stats";
import { UserChart } from "@/components/dashboard/user-chart";
import { UserAreaChart } from "@/components/dashboard/user-area-chart";
import { UserRecentActivity } from "@/components/dashboard/user-recent";
import { OrgQuickActions } from "@/components/dashboard/org-quick-actions";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

export default function UserPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">My Dashboard</h1>
          <AppBreadcrumb />
        </div>
        <OrgQuickActions />
      </div>
      <UserStats />
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <UserChart />
        </div>
        <div className="lg:col-span-3">
          <UserRecentActivity />
        </div>
      </div>
      <UserAreaChart />
    </div>
  );
}
