"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface SubscriptionItem {
  id: number;
  customer: string;
  org: string;
  plan: string;
  amount: string;
  currency: string;
  status: string;
  date: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trialing: "secondary",
  canceled: "destructive",
  expired: "outline",
  past_due: "destructive",
  pending: "outline",
};

export function RecentSubscriptions() {
  const { orgId } = useOrg();
  const [items, setItems] = useState<SubscriptionItem[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/dashboard?orgId=${orgId || ""}`);
      if (!res.ok || ignore) return;
      const d = await res.json();
      setItems(d.recentSubscriptions || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Recent Subscriptions</CardTitle>
          <p className="text-sm text-muted-foreground">Latest sign-ups across the platform</p>
        </div>
        <Link href="/admin/subscriptions" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <div className="space-y-1">
            {items.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{s.customer}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.org} · {s.plan}</p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    {s.currency} {Number(s.amount).toLocaleString()}
                  </span>
                  <Badge variant={statusVariant[s.status] || "outline"}>{s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
