"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Database, Activity } from "lucide-react";

interface Stats {
  totalOrgs: number;
  totalUsers: number;
  totalRecords: number;
  activeNow: number;
}

export function SuperAdminStats() {
  const { orgId } = useOrg();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/dashboard?orgId=${orgId || ""}`);
      if (!res.ok || ignore) return;
      const data = await res.json();
      setStats(data.stats);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  const items = [
    { title: "Total Organizations", value: stats?.totalOrgs ?? "—", icon: Building2 },
    { title: "Total Users", value: stats?.totalUsers ?? "—", icon: Users },
    { title: "Total Records", value: stats?.totalRecords ?? "—", icon: Database },
    { title: "Active Now", value: stats?.activeNow ?? "—", icon: Activity },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              {(() => { const Icon = item.icon; return <Icon className="h-4 w-4 text-primary" />; })()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
