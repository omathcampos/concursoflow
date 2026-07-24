import { describe, expect, it } from "vitest";

import { sessionFormSchema } from "@/lib/domain/session-validation";

const base = {
  subjectId: "subj-1",
  topicId: null,
  type: "questoes" as const,
  startedAt: "2026-03-02T10:00:00.000Z",
  durationMin: 60,
  questionsTotal: null,
  questionsCorrect: null,
  pagesRead: null,
  notes: null,
  scheduleReview: false,
};

describe("sessionFormSchema", () => {
  it("aceita dados válidos", () => {
    const result = sessionFormSchema.safeParse({ ...base, questionsTotal: 20, questionsCorrect: 15 });
    expect(result.success).toBe(true);
  });

  it("rejeita acertos maior que o total de questões", () => {
    const result = sessionFormSchema.safeParse({ ...base, questionsTotal: 10, questionsCorrect: 15 });
    expect(result.success).toBe(false);
  });

  it("aceita acertos igual ao total", () => {
    const result = sessionFormSchema.safeParse({ ...base, questionsTotal: 10, questionsCorrect: 10 });
    expect(result.success).toBe(true);
  });

  it("rejeita duração zero ou negativa", () => {
    expect(sessionFormSchema.safeParse({ ...base, durationMin: 0 }).success).toBe(false);
    expect(sessionFormSchema.safeParse({ ...base, durationMin: -5 }).success).toBe(false);
  });

  it("rejeita matéria vazia", () => {
    expect(sessionFormSchema.safeParse({ ...base, subjectId: "" }).success).toBe(false);
  });

  it("aceita sem matéria de questões (teoria, sem questionsTotal/Correct)", () => {
    const result = sessionFormSchema.safeParse({ ...base, type: "teoria", pagesRead: 12 });
    expect(result.success).toBe(true);
  });
});
