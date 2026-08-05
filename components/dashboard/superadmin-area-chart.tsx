"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

const chartConfig = {
  value: {
    label: "Activity",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

export function SuperAdminAreaChart() {
  const { orgId } = useOrg();
  const [data, setData] = useState<{ month: string; value: number }[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/dashboard?orgId=${orgId || ""}`);
      if (!res.ok || ignore) return;
      const d = await res.json();
      setData(d.chartData || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Platform Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Activity over time</p>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full aspect-auto">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(0, 3)} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="var(--color-chart-1)" fill="url(#fillValue)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
