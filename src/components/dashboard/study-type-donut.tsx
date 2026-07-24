"use client";

import { Cell, Pie, PieChart } from "recharts";

import { ChartEmptyState } from "@/components/dashboard/chart-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { studyTypeDistribution } from "@/lib/domain/stats";
import type { BlockType, Session } from "@/lib/data/types";

interface StudyTypeDonutProps {
  sessions: Session[];
}

const TYPE_COLORS: Record<BlockType, string> = {
  teoria: "var(--color-chart-1)",
  questoes: "var(--color-chart-2)",
  revisao: "var(--color-chart-3)",
  lei_seca: "var(--color-chart-4)",
  aula: "var(--color-chart-5)",
};

export function StudyTypeDonut({ sessions }: StudyTypeDonutProps) {
  const data = studyTypeDistribution(sessions);

  const config = Object.fromEntries(data.map((entry) => [entry.type, { label: entry.label, color: TYPE_COLORS[entry.type] }])) satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por tipo de estudo</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <ChartEmptyState message="Sem sessões registradas ainda." />
        ) : (
          <ChartContainer config={config} className="mx-auto aspect-square h-64">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie data={data} dataKey="minutes" nameKey="type" innerRadius={60} outerRadius={90} strokeWidth={2}>
                {data.map((entry) => (
                  <Cell key={entry.type} fill={TYPE_COLORS[entry.type]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
