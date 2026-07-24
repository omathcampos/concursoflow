"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartEmptyState } from "@/components/dashboard/chart-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { weeklyEvolution } from "@/lib/domain/stats";
import type { Session } from "@/lib/data/types";

interface WeeklyEvolutionChartProps {
  sessions: Session[];
  now?: Date;
}

const CONFIG = {
  hours: { label: "Horas", color: "var(--color-chart-1)" },
  accuracy: { label: "% de acerto", color: "var(--color-chart-3)" },
} satisfies ChartConfig;

export function WeeklyEvolutionChart({ sessions, now = new Date() }: WeeklyEvolutionChartProps) {
  const data = weeklyEvolution(sessions, 12, now);
  const hasData = data.some((week) => week.hours > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução semanal</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <ChartEmptyState message="Sem dados nas últimas 12 semanas." />
        ) : (
          <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full">
            <LineChart data={data} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} />
              <YAxis yAxisId="hours" tickLine={false} axisLine={false} unit="h" />
              <YAxis yAxisId="accuracy" orientation="right" tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line yAxisId="hours" type="monotone" dataKey="hours" stroke="var(--color-hours)" strokeWidth={2} dot={false} />
              <Line
                yAxisId="accuracy"
                type="monotone"
                dataKey="accuracy"
                stroke="var(--color-accuracy)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
