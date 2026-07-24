"use client";

import { addDays, format } from "date-fns";
import { ChevronDown, Repeat2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ReviewCard } from "@/components/reviews/review-card";
import { SessionFormDialog } from "@/components/sessions/session-form-dialog";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionFormData } from "@/lib/domain/session-validation";
import type { Review } from "@/lib/data/types";
import { useRepo } from "@/lib/data/use-repo";
import { cn } from "@/lib/utils";

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export default function RevisoesPage() {
  const repo = useRepo();
  const subjects = repo.subjects.list();
  const topics = repo.topics.list();
  const sessions = repo.sessions.list();
  const reviews = repo.reviews.list();

  const [completingReviewId, setCompletingReviewId] = useState<string | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);

  const completingReview = completingReviewId ? reviews.find((r) => r.id === completingReviewId) : undefined;

  const today = todayStr();
  const weekAhead = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const pending = reviews.filter((r) => r.status === "pending").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = pending.filter((r) => r.dueDate < today);
  const dueToday = pending.filter((r) => r.dueDate === today);
  const upcoming = pending.filter((r) => r.dueDate > today && r.dueDate <= weekAhead);

  function handleSkip(review: Review) {
    repo.reviews.skip(review.id);
    toast("Revisão pulada", {
      action: {
        label: "Desfazer",
        onClick: () => repo.reviews.update(review.id, { status: "pending" }),
      },
    });
  }

  function handleCompleteSubmit(data: SessionFormData) {
    if (!completingReview) return;
    const cycle = repo.cycle.getActive();
    const inCycle = cycle && repo.cycle.entries(cycle.id).some((e) => e.subjectId === data.subjectId);
    repo.sessions.create({
      ...data,
      blockId: null,
      cycleId: inCycle ? cycle!.id : null,
      cycleRound: inCycle ? cycle!.round : null,
    });
    repo.reviews.complete(completingReview.id);
    setCompletingReviewId(null);
  }

  function renderCard(review: Review) {
    const subject = subjects.find((s) => s.id === review.subjectId);
    if (!subject) return null;
    const topic = review.topicId ? topics.find((t) => t.id === review.topicId) : undefined;
    const originSession = review.sessionId ? sessions.find((s) => s.id === review.sessionId) : undefined;
    return (
      <ReviewCard
        key={review.id}
        review={review}
        subject={subject}
        topic={topic}
        originSession={originSession}
        onComplete={() => setCompletingReviewId(review.id)}
        onSkip={() => handleSkip(review)}
      />
    );
  }

  const hasAnyPending = pending.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisões</h1>
        <p className="mt-1 text-muted-foreground">Nunca perca uma revisão.</p>
      </div>

      {!hasAnyPending ? (
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Repeat2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Nenhuma revisão pendente</CardTitle>
              <CardDescription>
                Marque &quot;Agendar revisões espaçadas&quot; ao registrar uma sessão de teoria para começar.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <>
          {overdue.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">Atrasadas ({overdue.length})</h2>
              <div className="flex flex-col gap-2">{overdue.map(renderCard)}</div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Hoje ({dueToday.length})</h2>
            {dueToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma revisão para hoje.</p>
            ) : (
              <div className="flex flex-col gap-2">{dueToday.map(renderCard)}</div>
            )}
          </div>

          {upcoming.length > 0 ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowUpcoming((v) => !v)}
                className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", showUpcoming && "rotate-180")} />
                Próximas 7 dias ({upcoming.length})
              </button>
              {showUpcoming ? <div className="flex flex-col gap-2">{upcoming.map(renderCard)}</div> : null}
            </div>
          ) : null}
        </>
      )}

      {completingReview ? (
        <SessionFormDialog
          open
          onOpenChange={(open) => !open && setCompletingReviewId(null)}
          subjects={subjects}
          topics={topics}
          title="Revisado — registrar sessão"
          initial={{
            subjectId: completingReview.subjectId,
            topicId: completingReview.topicId,
            type: "revisao",
            scheduleReview: false,
          }}
          onSubmit={handleCompleteSubmit}
        />
      ) : null}
    </div>
  );
}
