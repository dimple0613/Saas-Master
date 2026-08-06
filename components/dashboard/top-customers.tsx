"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface CustomerItem {
  name: string;
  email: string;
  org: string;
  subscribers: number;
  status: string;
  plan: string;
}

export function TopCustomers() {
  const { orgId } = useOrg();
  const [items, setItems] = useState<CustomerItem[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/dashboard?orgId=${orgId || ""}`);
      if (!res.ok || ignore) return;
      const d = await res.json();
      setItems(d.topCustomers || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  const maxSubscribers = Math.max(...items.map((c) => c.subscribers), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Customers</CardTitle>
        <p className="text-sm text-muted-foreground">Customers with the most subscribers</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <span className="text-xs font-medium text-muted-foreground">{c.subscribers} subs</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.org} · {c.plan}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(3, (c.subscribers / maxSubscribers) * 100)}%` }}
                    />
                  </div>
                </div>
                <Badge variant={c.status === "active" ? "default" : "outline"}>{c.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
