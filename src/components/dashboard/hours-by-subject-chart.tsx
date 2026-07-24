"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { ChartEmptyState } from "@/components/dashboard/chart-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hoursBySubject, PERIOD_OPTIONS, type PeriodKey } from "@/lib/domain/stats";
import type { Session, Subject } from "@/lib/data/types";

interface HoursBySubjectChartProps {
  sessions: Session[];
  subjects: Subject[];
  now?: Date;
}

export function HoursBySubjectChart({ sessions, subjects, now = new Date() }: HoursBySubjectChartProps) {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const data = hoursBySubject(sessions, subjects, period, now);

  const config = Object.fromEntries(data.map((entry) => [entry.subjectId, { label: entry.name, color: entry.color }])) satisfies ChartConfig;

  return (
    <Card data-testid="chart-hours-by-subject">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Horas por matéria</CardTitle>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <TabsList>
            {PERIOD_OPTIONS.map((option) => (
              <TabsTrigger key={option.key} value={option.key}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <ChartEmptyState message="Nenhuma sessão registrada nesse período." />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} unit="h" />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="hours" radius={4}>
                {data.map((entry) => (
                  <Cell key={entry.subjectId} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
