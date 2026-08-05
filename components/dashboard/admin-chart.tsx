"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const chartConfig = {
  activity: {
    label: "Activity",
    color: "var(--color-chart-1)",
  },
  members: {
    label: "New Members",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

interface ChartItem {
  month: string;
  value: number;
}

export function AdminChart() {
  const { orgId } = useOrg();
  const [activity, setActivity] = useState<ChartItem[]>([]);
  const [members, setMembers] = useState<ChartItem[]>([]);

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
      <CardHeader><CardTitle>Org Overview</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full aspect-auto">
          <BarChart data={merged}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="activity" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="members" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
