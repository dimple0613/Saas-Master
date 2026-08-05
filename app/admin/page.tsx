"use client";

import { SuperAdminStats } from "@/components/dashboard/superadmin-stats";
import { SuperAdminChart } from "@/components/dashboard/superadmin-chart";
import { SuperAdminAreaChart } from "@/components/dashboard/superadmin-area-chart";
import { SuperAdminRecentActivity } from "@/components/dashboard/superadmin-recent";
import { OrgQuickActions } from "@/components/dashboard/org-quick-actions";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

export default function SuperAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Platform Dashboard</h1>
          <AppBreadcrumb />
        </div>
        <OrgQuickActions />
      </div>
      <SuperAdminStats />
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SuperAdminChart />
        </div>
        <div className="lg:col-span-3">
          <SuperAdminRecentActivity />
        </div>
      </div>
      <SuperAdminAreaChart />
    </div>
  );
}
