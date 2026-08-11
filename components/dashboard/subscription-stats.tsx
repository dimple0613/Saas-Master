"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, LayoutGrid, Users, DollarSign } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Cell, type PieLabelRenderProps } from "recharts";

const chartConfig = {
  subscribers: {
    label: "Subscribers",
  },
} satisfies ChartConfig;

const RADIAN = Math.PI / 180;

function renderPlanLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const name = String(props.name ?? "");
  const pct = Math.round(Number(props.percent ?? 0) * 100);

  const cos = Math.cos(-midAngle * RADIAN);
  const sin = Math.sin(-midAngle * RADIAN);
  const labelRadius = outerRadius + 22;
  const x = cx + labelRadius * cos;
  const y = cy + labelRadius * sin;
  const edgeX = cx + outerRadius * cos;
  const edgeY = cy + outerRadius * sin;
  const anchor = x > cx ? "start" : "end";

  return (
    <g>
      <path d={`M${edgeX},${edgeY}L${x},${y}`} fill="none" strokeWidth={1} style={{ stroke: "var(--border)" }} />
      <text x={x} y={y - 4} textAnchor={anchor} fontSize={11} style={{ fill: "var(--muted-foreground)" }}>
        {name}
      </text>
      <text x={x} y={y + 12} textAnchor={anchor} fontSize={12} fontWeight={600} style={{ fill: "var(--foreground)" }}>
        {pct}%
      </text>
    </g>
  );
}

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
            <ChartContainer config={chartConfig} className="mx-auto aspect-auto h-[360px] w-full max-w-xl">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name, item) => {
                        const num = Number(value);
                        const pct = totalSubscribers > 0 ? (num / totalSubscribers) * 100 : 0;
                        const planName = item?.payload?.isActive === false ? `${name} (inactive)` : name;
                        return (
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground">{planName}</span>
                            <span className="font-mono font-medium text-foreground tabular-nums">
                              {num.toLocaleString()} · {pct.toFixed(0)}%
                            </span>
                          </span>
                        );
                      }}
                    />
                  }
                />
                <Pie
                  data={plans}
                  dataKey="subscribers"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="80%"
                  paddingAngle={2}
                  cornerRadius={5}
                  stroke="none"
                  labelLine={false}
                  label={renderPlanLabel}
                >
                  {plans.map((plan, index) => (
                    <Cell key={plan.id} fill={`var(--color-chart-${(index % 5) + 1})`} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
