"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const data = [
  { name: "Jan", total: 1863 },
  { name: "Feb", total: 3057 },
  { name: "Mar", total: 2374 },
  { name: "Apr", total: 7319 },
  { name: "May", total: 2190 },
  { name: "Jun", total: 4120 },
  { name: "Jul", total: 6432 },
  { name: "Aug", total: 5218 },
  { name: "Sep", total: 3845 },
  { name: "Oct", total: 4890 },
  { name: "Nov", total: 5634 },
  { name: "Dec", total: 7210 },
];

const chartConfig = {
  total: {
    label: "Total",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

export function ChartArea() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full aspect-auto">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
