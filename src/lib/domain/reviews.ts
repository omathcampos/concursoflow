import { addDays, format } from "date-fns";

import type { Review, ReviewStep } from "@/lib/data/types";

export const REVIEW_STEP_LABELS: Record<ReviewStep, string> = {
  1: "1ª · 24h",
  2: "2ª · 7d",
  3: "3ª · 30d",
};

function toDueDate(date: Date, daysToAdd: number): string {
  return format(addDays(date, daysToAdd), "yyyy-MM-dd");
}

export interface ScheduleFirstReviewInput {
  sessionId: string;
  subjectId: string;
  topicId: string | null;
}

/** Cria a revisão step 1 (D+1) para uma sessão com opt-in de revisão. */
export function scheduleFirstReview(
  input: ScheduleFirstReviewInput,
  from: Date = new Date(),
): Omit<Review, "id" | "createdAt"> {
  return {
    sessionId: input.sessionId,
    subjectId: input.subjectId,
    topicId: input.topicId,
    step: 1,
    dueDate: toDueDate(from, 1),
    status: "pending",
    completedAt: null,
  };
}

const STEP_OFFSET_DAYS: Record<ReviewStep, number | null> = {
  1: 7, // step 1 concluído -> step 2 em D+7
  2: 30, // step 2 concluído -> step 3 em D+30
  3: null, // step 3 concluído -> encerra o ciclo
};

/**
 * Dado uma revisão concluída, retorna a próxima do ciclo (ou null se for a
 * última). A contagem de dias parte do momento da conclusão, não da data de
 * vencimento original — completar atrasado não "acumula" atraso na próxima.
 */
export function nextReviewStep(review: Review, completedAt: Date = new Date()): Omit<Review, "id" | "createdAt"> | null {
  const offset = STEP_OFFSET_DAYS[review.step];
  if (offset === null) return null;

  return {
    sessionId: review.sessionId,
    subjectId: review.subjectId,
    topicId: review.topicId,
    step: (review.step + 1) as ReviewStep,
    dueDate: toDueDate(completedAt, offset),
    status: "pending",
    completedAt: null,
  };
}

/** Revisões pendentes vencidas até hoje (hoje + atrasadas) — base do badge e do card do dashboard. */
export function countReviewsDueToday(reviews: Review[], from: Date = new Date()): number {
  const today = format(from, "yyyy-MM-dd");
  return reviews.filter((review) => review.status === "pending" && review.dueDate <= today).length;
}
