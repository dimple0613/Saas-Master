"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RecordItem {
  title: string;
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

export function UserRecentActivity() {
  const { orgId } = useOrg();
  const [records, setRecords] = useState<RecordItem[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const url = orgId ? `/api/dashboard?orgId=${orgId}` : "/api/dashboard";
      const res = await fetch(url);
      if (!res.ok || ignore) return;
      const d = await res.json();
      setRecords(d.myRecords || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Recent Records</CardTitle>
        <p className="text-sm text-muted-foreground">Records you&apos;ve recently worked on.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {records.length === 0 && <p className="text-sm text-muted-foreground">No records yet.</p>}
          {records.map((record, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{record.title}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(record.time)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
