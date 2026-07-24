import { Flame, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accuracyLast30Days, computeStreak, minutesThisWeek, minutesToday, weekOverWeekDelta } from "@/lib/domain/stats";
import type { Session } from "@/lib/data/types";

interface StatCardsProps {
  sessions: Session[];
  now?: Date;
}

function hoursLabel(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

export function StatCards({ sessions, now = new Date() }: StatCardsProps) {
  const today = minutesToday(sessions, now);
  const week = minutesThisWeek(sessions, now);
  const delta = weekOverWeekDelta(sessions, now);
  const accuracy = accuracyLast30Days(sessions, now);
  const streak = computeStreak(sessions, now);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Horas hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <p data-testid="stat-hours-today" className="text-3xl font-semibold">
            {hoursLabel(today)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Horas na semana</CardTitle>
        </CardHeader>
        <CardContent className="flex items-baseline gap-2">
          <p data-testid="stat-hours-week" className="text-3xl font-semibold">
            {hoursLabel(week)}
          </p>
          {delta !== null ? (
            <span
              className={`flex items-center gap-0.5 text-xs font-medium ${delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
            >
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta)}%
            </span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">% de acerto (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <p data-testid="stat-accuracy" className="text-3xl font-semibold">
            {accuracy !== null ? `${accuracy}%` : "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Streak</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-1.5">
          <Flame className={`h-6 w-6 ${streak > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          <p data-testid="stat-streak" className="text-3xl font-semibold">
            {streak}
          </p>
          <span className="text-sm text-muted-foreground">{streak === 1 ? "dia" : "dias"}</span>
        </CardContent>
      </Card>
    </div>
  );
}
