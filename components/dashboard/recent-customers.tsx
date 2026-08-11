"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface RecentCustomer {
  id: number;
  name: string;
  email: string;
  plan: string | null;
  status: string;
  joinedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "active"
      ? "bg-green-500/10 text-green-600 dark:text-green-400"
      : status === "suspended"
        ? "bg-red-500/10 text-red-600 dark:text-red-400"
        : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {status}
    </span>
  );
}

export function RecentCustomers() {
  const { orgId } = useOrg();
  const [items, setItems] = useState<RecentCustomer[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/dashboard?orgId=${orgId || ""}`);
      if (!res.ok || ignore) return;
      const d = await res.json();
      setItems(d.recentCustomers || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  function formatJoinedDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Recent Customers</CardTitle>
          <p className="text-sm text-muted-foreground">Latest customers to join the platform</p>
        </div>
        <Link href="/admin/customers" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">Plan</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "C"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      {c.plan ? (
                        <span className="font-medium text-foreground">{c.plan}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No plan</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">{formatJoinedDate(c.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
