"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  name: string;
  action: string;
  org: string;
  time: string;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SuperAdminRecentActivity() {
  const { orgId } = useOrg();
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/dashboard?orgId=${orgId || ""}`);
      if (!res.ok || ignore) return;
      const d = await res.json();
      setItems(d.recentActivity || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Recent activity across all organizations.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
          {items.map((item, i) => (
            <div key={i} className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{item.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.action}</p>
              </div>
              <div className="ml-auto flex flex-col items-end gap-0.5">
                <span className="text-[10px] text-muted-foreground">{item.org}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(item.time)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
