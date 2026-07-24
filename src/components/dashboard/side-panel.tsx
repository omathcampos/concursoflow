import { ArrowRight, Repeat2, Target } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isCycleComplete, suggestNextSubject } from "@/lib/domain/cycle";
import { countReviewsDueToday } from "@/lib/domain/reviews";
import { topOverdueSubjects } from "@/lib/domain/stats";
import type { CycleEntry, Review, Subject } from "@/lib/data/types";

interface SidePanelProps {
  subjects: Subject[];
  cycleEntries: CycleEntry[];
  reviews: Review[];
  now?: Date;
}

export function SidePanel({ subjects, cycleEntries, reviews, now = new Date() }: SidePanelProps) {
  const progressEntries = cycleEntries.map((entry) => {
    const subject = subjects.find((s) => s.id === entry.subjectId);
    return { subjectId: entry.subjectId, weight: subject?.weight ?? 1, targetMinutes: entry.targetMinutes, doneMinutes: entry.doneMinutes };
  });
  const suggestedSubject = subjects.find((s) => s.id === suggestNextSubject(progressEntries));
  const roundComplete = isCycleComplete(progressEntries);

  const reviewsToday = countReviewsDueToday(reviews, now);
  const overdueSubjects = topOverdueSubjects(reviews, subjects, now, 3);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Estude agora</CardTitle>
        </CardHeader>
        <CardContent>
          {suggestedSubject ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-4 w-4" />
              </div>
              <p className="font-semibold">{suggestedSubject.name}</p>
            </div>
          ) : roundComplete ? (
            <p className="text-sm text-muted-foreground">Rodada concluída — hora de partir para a próxima! 🎉</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/ciclo" className="text-primary hover:underline">
                Monte um ciclo
              </Link>{" "}
              para receber sugestões.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Revisões hoje</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-3xl font-semibold">{reviewsToday}</p>
          <Link href="/revisoes" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver revisões
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Matérias mais atrasadas</CardTitle>
        </CardHeader>
        <CardContent>
          {overdueSubjects.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Repeat2 className="h-4 w-4" />
              Nenhuma revisão atrasada.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overdueSubjects.map((entry) => (
                <li key={entry.subjectId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
                    {entry.name}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {entry.maxDaysLate} {entry.maxDaysLate === 1 ? "dia" : "dias"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
