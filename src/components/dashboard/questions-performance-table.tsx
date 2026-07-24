import { ChartEmptyState } from "@/components/dashboard/chart-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { questionsPerformanceBySubject, type PerformanceBucket } from "@/lib/domain/stats";
import type { Session, Subject } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface QuestionsPerformanceTableProps {
  sessions: Session[];
  subjects: Subject[];
}

const BUCKET_CLASSES: Record<PerformanceBucket, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-destructive",
};

export function QuestionsPerformanceTable({ sessions, subjects }: QuestionsPerformanceTableProps) {
  const rows = questionsPerformanceBySubject(sessions, subjects);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho em questões por matéria</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <ChartEmptyState message="Registre sessões de questões para ver seu desempenho." />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div key={row.subjectId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
                    {row.name}
                  </span>
                  <span className="text-muted-foreground">
                    {row.correct}/{row.total} · <span className="font-semibold text-foreground">{row.percent}%</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", BUCKET_CLASSES[row.bucket])}
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
