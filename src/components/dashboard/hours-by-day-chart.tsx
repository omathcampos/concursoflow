"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartEmptyState } from "@/components/dashboard/chart-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { hoursByDayLast14 } from "@/lib/domain/stats";
import type { Session, Subject } from "@/lib/data/types";

interface HoursByDayChartProps {
  sessions: Session[];
  subjects: Subject[];
  now?: Date;
}

export function HoursByDayChart({ sessions, subjects, now = new Date() }: HoursByDayChartProps) {
  const data = hoursByDayLast14(sessions, subjects, now);
  const hasData = data.some((day) => subjects.some((subject) => Number(day[subject.id]) > 0));

  const config = Object.fromEntries(subjects.map((subject) => [subject.id, { label: subject.name, color: subject.color }])) satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas por dia (últimos 14 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <ChartEmptyState message="Sem sessões nos últimos 14 dias." />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <BarChart data={data} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} />
              <YAxis tickLine={false} axisLine={false} unit="h" />
              <ChartTooltip content={<ChartTooltipContent />} />
              {subjects.map((subject) => (
                <Bar key={subject.id} dataKey={subject.id} stackId="hours" fill={subject.color} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
