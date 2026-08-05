"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, UserPlus, Clock } from "lucide-react";

interface Stats {
  memberCount: number;
  recordCount: number;
  pendingInvites: number;
  activityThisWeek: number;
}

export function AdminStats() {
  const { orgId } = useOrg();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const url = orgId ? `/api/dashboard?orgId=${orgId}` : "/api/dashboard";
      const res = await fetch(url);
      if (!res.ok || ignore) return;
      const data = await res.json();
      setStats(data.stats);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  const items = [
    { title: "Org Members", value: stats?.memberCount ?? "—", icon: Users },
    { title: "Org Records", value: stats?.recordCount ?? "—", icon: FileText },
    { title: "Pending Invites", value: stats?.pendingInvites ?? "—", icon: UserPlus },
    { title: "Activity This Week", value: stats?.activityThisWeek ?? "—", icon: Clock },
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
