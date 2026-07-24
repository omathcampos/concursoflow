"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import { REVIEW_STEP_LABELS } from "@/lib/domain/reviews";
import type { Review, Session, Subject, Topic } from "@/lib/data/types";

interface ReviewCardProps {
  review: Review;
  subject: Subject;
  topic?: Topic;
  originSession?: Session;
  onComplete: () => void;
  onSkip: () => void;
}

export function ReviewCard({ review, subject, topic, originSession, onComplete, onSkip }: ReviewCardProps) {
  const daysLate = differenceInCalendarDays(new Date(), parseISO(review.dueDate));
  const isLate = daysLate > 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden />
        <div className="flex flex-col">
          <span className="font-medium">{subject.name}</span>
          {topic ? <span className="text-xs text-muted-foreground">{topic.name}</span> : null}
        </div>
        <Badge variant="secondary">{REVIEW_STEP_LABELS[review.step]}</Badge>
        {isLate ? (
          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
            {daysLate} {daysLate === 1 ? "dia atrasada" : "dias atrasada"}
          </Badge>
        ) : null}
        {originSession ? (
          <span className="text-xs text-muted-foreground">
            Origem: {BLOCK_TYPE_LABELS[originSession.type]} em{" "}
            {format(new Date(originSession.startedAt), "dd/MM", { locale: ptBR })}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={onSkip}>
            <X className="h-3.5 w-3.5" />
            Pular
          </Button>
          <Button size="sm" onClick={onComplete}>
            <Check className="h-3.5 w-3.5" />
            Revisado
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
