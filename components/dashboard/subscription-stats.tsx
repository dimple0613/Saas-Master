"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, LayoutGrid, Users, DollarSign } from "lucide-react";

interface SubscriptionStats {
  totalPlans: number;
  activePlans: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  canceledSubscriptions: number;
  mrr: number;
}

interface PlanData {
  id: number;
  name: string;
  slug: string;
  priceMonthly: string;
  currency: string;
  billingCycle: string;
  isActive: boolean;
  subscribers: number;
}

export function SubscriptionStats() {
  const { orgId } = useOrg();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/dashboard?orgId=${orgId || ""}`);
      if (!res.ok || ignore) return;
      const data = await res.json();
      setStats(data.subscriptionStats);
      setPlans(data.planData || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  const items = [
    { title: "Total Plans", value: stats?.totalPlans ?? "—", icon: LayoutGrid },
    { title: "Active Plans", value: stats?.activePlans ?? "—", icon: CreditCard },
    { title: "Active Subscribers", value: stats?.activeSubscriptions ?? "—", icon: Users },
    {
      title: "MRR",
      value: stats ? `$${stats.mrr.toLocaleString()}` : "—",
      icon: DollarSign,
      sub: stats ? `${stats.trialSubscriptions} trialing, ${stats.canceledSubscriptions} canceled` : undefined,
    },
  ];

  const totalSubscribers = plans.reduce((sum, p) => sum + p.subscribers, 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plans & Subscriptions</CardTitle>
        <p className="text-sm text-muted-foreground">Overview of plans and their adoption.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{item.title}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  {(() => { const Icon = item.icon; return <Icon className="h-4 w-4 text-primary" />; })()}
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
              {item.sub && <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>}
            </div>
          ))}
        </div>

        {plans.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-foreground">Plan Distribution</p>
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-foreground">
                      {plan.name}
                      {!plan.isActive && <span className="ml-1 text-muted-foreground">(inactive)</span>}
                    </span>
                    <span className="text-muted-foreground">
                      {plan.subscribers} subscriber{plan.subscribers === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(2, (plan.subscribers / totalSubscribers) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
