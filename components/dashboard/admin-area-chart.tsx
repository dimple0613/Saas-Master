"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

const chartConfig = {
  activity: {
    label: "Activity",
    color: "var(--color-chart-1)",
  },
  members: {
    label: "Members",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

export function AdminAreaChart() {
  const { orgId } = useOrg();
  const [activity, setActivity] = useState<{ month: string; value: number }[]>([]);
  const [members, setMembers] = useState<{ month: string; value: number }[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const url = orgId ? `/api/dashboard?orgId=${orgId}` : "/api/dashboard";
      const res = await fetch(url);
      if (!res.ok || ignore) return;
      const d = await res.json();
      setActivity(d.chartData || []);
      setMembers(d.memberGrowth || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  const merged = activity.map((a) => {
    const m = members.find((x) => x.month === a.month);
    return { month: a.month, activity: a.value, members: m?.value || 0 };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Team Engagement</CardTitle>
          <p className="text-sm text-muted-foreground">Activity vs member growth</p>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full aspect-auto">
          <AreaChart data={merged}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(0, 3)} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillActivity2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillMembers2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="activity" stroke="var(--color-chart-1)" fill="url(#fillActivity2)" strokeWidth={2} />
            <Area type="monotone" dataKey="members" stroke="var(--color-chart-2)" fill="url(#fillMembers2)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
