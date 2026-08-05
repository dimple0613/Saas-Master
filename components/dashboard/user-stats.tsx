"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Activity, Clock, Users } from "lucide-react";

interface Stats {
  myRecordCount: number;
  myActivityCount: number;
  lastActive: string | null;
  orgMemberCount: number;
}

function timeAgo(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function UserStats() {
  const { orgId } = useOrg();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const url = orgId ? `/api/dashboard?orgId=${orgId}` : "/api/dashboard";
      const res = await fetch(url);
      if (!res.ok || ignore) return;
      const data = await res.json();
      if (!ignore) setStats(data.stats);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  const items = [
    { title: "My Records", value: stats?.myRecordCount ?? "—", icon: FileText },
    { title: "My Activity", value: stats?.myActivityCount ?? "—", icon: Activity },
    { title: "Last Active", value: timeAgo(stats?.lastActive ?? null), icon: Clock },
    { title: "Org Members", value: stats?.orgMemberCount ?? "—", icon: Users },
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
