import { describe, expect, it } from "vitest";

import { nextReviewStep, scheduleFirstReview } from "@/lib/domain/reviews";
import type { Review } from "@/lib/data/types";

function makeReview(overrides: Partial<Review>): Review {
  return {
    id: "review-1",
    sessionId: "session-1",
    subjectId: "subject-1",
    topicId: null,
    step: 1,
    dueDate: "2026-03-10",
    status: "pending",
    completedAt: null,
    createdAt: "2026-03-09T10:00:00.000Z",
    ...overrides,
  };
}

describe("scheduleFirstReview", () => {
  it("agenda a revisão step 1 para D+1 a partir da sessão", () => {
    const review = scheduleFirstReview(
      { sessionId: "session-1", subjectId: "subject-1", topicId: "topic-1" },
      new Date("2026-03-09T22:00:00"),
    );
    expect(review.step).toBe(1);
    expect(review.dueDate).toBe("2026-03-10");
    expect(review.status).toBe("pending");
    expect(review.sessionId).toBe("session-1");
    expect(review.topicId).toBe("topic-1");
  });

  it("respeita o fuso local ao calcular a data (sem shift de UTC)", () => {
    // 23h de um dia local — toISOString() cairia no dia seguinte em fusos negativos;
    // format() do date-fns usa componentes locais e evita esse bug.
    const review = scheduleFirstReview(
      { sessionId: "s", subjectId: "subj", topicId: null },
      new Date(2026, 2, 9, 23, 30), // 09/mar/2026 23:30 no horário local
    );
    expect(review.dueDate).toBe("2026-03-10");
  });
});

describe("nextReviewStep", () => {
  it("step 1 concluído gera step 2 em D+7 a partir de agora (não da data original)", () => {
    const review = makeReview({ step: 1, dueDate: "2026-03-10" });
    const completedLate = new Date("2026-03-15T09:00:00"); // completada 5 dias atrasada
    const next = nextReviewStep(review, completedLate);
    expect(next).not.toBeNull();
    expect(next!.step).toBe(2);
    expect(next!.dueDate).toBe("2026-03-22"); // 15/mar + 7, não 10/mar + 7
  });

  it("step 2 concluído gera step 3 em D+30 a partir de agora", () => {
    const review = makeReview({ step: 2, dueDate: "2026-03-17" });
    const next = nextReviewStep(review, new Date("2026-03-17T09:00:00"));
    expect(next!.step).toBe(3);
    expect(next!.dueDate).toBe("2026-04-16");
  });

  it("step 3 concluído encerra o ciclo (retorna null)", () => {
    const review = makeReview({ step: 3, dueDate: "2026-04-16" });
    expect(nextReviewStep(review, new Date("2026-04-16T09:00:00"))).toBeNull();
  });

  it("a próxima revisão preserva matéria, tópico e sessão de origem", () => {
    const review = makeReview({ step: 1, subjectId: "subj-x", topicId: "topic-y", sessionId: "sess-z" });
    const next = nextReviewStep(review, new Date("2026-03-10T09:00:00"));
    expect(next!.subjectId).toBe("subj-x");
    expect(next!.topicId).toBe("topic-y");
    expect(next!.sessionId).toBe("sess-z");
    expect(next!.status).toBe("pending");
  });
});
