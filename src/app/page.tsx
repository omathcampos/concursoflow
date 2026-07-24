"use client";

import { isSameWeek, isToday } from "date-fns";
import { Flame, LayoutDashboard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRepo } from "@/lib/data/use-repo";
import { countReviewsDueToday } from "@/lib/domain/reviews";

function hoursLabel(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

export default function DashboardPage() {
  const repo = useRepo();
  const sessions = repo.sessions.list();
  const now = new Date();

  const minutesToday = sessions
    .filter((session) => isToday(new Date(session.startedAt)))
    .reduce((sum, session) => sum + session.durationMin, 0);

  const minutesWeek = sessions
    .filter((session) => isSameWeek(new Date(session.startedAt), now, { weekStartsOn: 1 }))
    .reduce((sum, session) => sum + session.durationMin, 0);

  const reviewsToday = countReviewsDueToday(repo.reviews.list());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Visão geral do seu progresso.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Horas hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{hoursLabel(minutesToday)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Horas na semana</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{hoursLabel(minutesWeek)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Revisões hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{reviewsToday}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="flex flex-1 items-center justify-between gap-3">
            <CardTitle>Em construção</CardTitle>
            <Badge variant="secondary">
              <Flame className="h-3 w-3" /> Em breve
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Evolução semanal, % de acerto por matéria, distribuição por tipo de estudo e streak de dias consecutivos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
