"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const chartConfig = {
  myActivity: {
    label: "My Activity",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

interface ChartItem {
  month: string;
  value: number;
}

export function UserChart() {
  const { orgId } = useOrg();
  const [data, setData] = useState<ChartItem[]>([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const url = orgId ? `/api/dashboard?orgId=${orgId}` : "/api/dashboard";
      const res = await fetch(url);
      if (!res.ok || ignore) return;
      const d = await res.json();
      setData(d.chartData || []);
    })();
    return () => { ignore = true; };
  }, [orgId]);

  return (
    <Card>
      <CardHeader><CardTitle>My Activity</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full aspect-auto">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
