"use client";

import { SuperAdminStats } from "@/components/dashboard/superadmin-stats";
import { SubscriptionStats } from "@/components/dashboard/subscription-stats";
import { SuperAdminChart } from "@/components/dashboard/superadmin-chart";
import { SuperAdminAreaChart } from "@/components/dashboard/superadmin-area-chart";
import { SuperAdminRecentActivity } from "@/components/dashboard/superadmin-recent";
import { RecentSubscriptions } from "@/components/dashboard/recent-subscriptions";
import { TopCustomers } from "@/components/dashboard/top-customers";
import { OrgQuickActions } from "@/components/dashboard/org-quick-actions";
import { QuickLinks } from "@/components/dashboard/quick-links";
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
      <QuickLinks />
      <SuperAdminStats />
      <SubscriptionStats />
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SuperAdminChart />
        </div>
        <div className="lg:col-span-3">
          <SuperAdminRecentActivity />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RecentSubscriptions />
        </div>
        <div className="lg:col-span-3">
          <TopCustomers />
        </div>
      </div>
      <SuperAdminAreaChart />
    </div>
  );
}
