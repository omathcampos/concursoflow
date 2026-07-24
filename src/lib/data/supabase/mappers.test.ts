import { describe, expect, it } from "vitest";

import {
  fromAnnotationRow,
  fromBlockRow,
  fromCycleEntryRow,
  fromCycleRow,
  fromProfileRow,
  fromReviewRow,
  fromSessionRow,
  fromSubjectRow,
  fromTopicRow,
  toAnnotationRow,
  toBlockRow,
  toCycleEntryRow,
  toCycleRow,
  toProfileRow,
  toReviewRow,
  toSessionRow,
  toSubjectRow,
  toTopicRow,
} from "@/lib/data/supabase/mappers";

const USER_ID = "user-abc-123";

describe("subjects mapper", () => {
  it("ida-e-volta sem perda de dados", () => {
    const input = { name: "Direito Constitucional", color: "#3b82f6", weight: 5, notes: "revisar sumulas" };
    const row = toSubjectRow(input, USER_ID);
    expect(row).toEqual({ user_id: USER_ID, name: "Direito Constitucional", color: "#3b82f6", weight: 5, notes: "revisar sumulas" });

    const full = { id: "s1", created_at: "2026-01-01T00:00:00.000Z", ...row };
    expect(fromSubjectRow(full)).toEqual({
      id: "s1",
      name: "Direito Constitucional",
      color: "#3b82f6",
      weight: 5,
      notes: "revisar sumulas",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("notes nulo é preservado", () => {
    const row = toSubjectRow({ name: "A", color: "#000", weight: 1, notes: null }, USER_ID);
    expect(row.notes).toBeNull();
    const full = { id: "s1", created_at: "2026-01-01T00:00:00.000Z", ...row };
    expect(fromSubjectRow(full).notes).toBeNull();
  });
});

describe("topics mapper", () => {
  it("ida-e-volta sem perda de dados", () => {
    const input = { subjectId: "s1", name: "Crase", status: "studying" as const, position: 2, notes: null };
    const row = toTopicRow(input, USER_ID);
    const full = { id: "t1", created_at: "2026-01-01T00:00:00.000Z", ...row };
    expect(fromTopicRow(full)).toEqual({
      id: "t1",
      subjectId: "s1",
      name: "Crase",
      status: "studying",
      position: 2,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("cycles mapper", () => {
  it("ida-e-volta sem perda de dados", () => {
    const input = { name: "Meu ciclo", isActive: true, round: 3 };
    const row = toCycleRow(input, USER_ID);
    expect(row).toEqual({ user_id: USER_ID, name: "Meu ciclo", is_active: true, round: 3 });
    const full = { id: "c1", created_at: "2026-01-01T00:00:00.000Z", ...row };
    expect(fromCycleRow(full)).toEqual({ id: "c1", name: "Meu ciclo", isActive: true, round: 3, createdAt: "2026-01-01T00:00:00.000Z" });
  });
});

describe("cycle_entries mapper", () => {
  it("ida-e-volta sem perda de dados (doneMinutes é derivado, não faz parte da row)", () => {
    const input = { cycleId: "c1", subjectId: "s1", targetMinutes: 300 };
    const row = toCycleEntryRow(input, USER_ID);
    expect(row).toEqual({ user_id: USER_ID, cycle_id: "c1", subject_id: "s1", target_minutes: 300 });
    const full = { id: "ce1", ...row };
    expect(fromCycleEntryRow(full)).toEqual({ id: "ce1", cycleId: "c1", subjectId: "s1", targetMinutes: 300 });
  });
});

describe("blocks mapper", () => {
  it("ida-e-volta sem perda de dados", () => {
    const input = {
      subjectId: "s1",
      topicId: "t1",
      type: "teoria" as const,
      status: "planned" as const,
      startAt: "2026-01-01T10:00:00.000Z",
      endAt: "2026-01-01T11:00:00.000Z",
      recurrenceRule: null,
      notes: null,
    };
    const row = toBlockRow(input, USER_ID);
    const full = { id: "b1", created_at: "2026-01-01T00:00:00.000Z", ...row };
    expect(fromBlockRow(full)).toEqual({
      id: "b1",
      subjectId: "s1",
      topicId: "t1",
      type: "teoria",
      status: "planned",
      startAt: "2026-01-01T10:00:00.000Z",
      endAt: "2026-01-01T11:00:00.000Z",
      recurrenceRule: null,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("topicId e recurrenceRule nulos são preservados", () => {
    const row = toBlockRow(
      {
        subjectId: "s1",
        topicId: null,
        type: "revisao",
        status: "done",
        startAt: "2026-01-01T10:00:00.000Z",
        endAt: "2026-01-01T11:00:00.000Z",
        recurrenceRule: "WEEKLY:abc",
        notes: "nota",
      },
      USER_ID,
    );
    expect(row.topic_id).toBeNull();
    expect(row.recurrence_rule).toBe("WEEKLY:abc");
  });
});

describe("sessions mapper", () => {
  it("ida-e-volta sem perda de dados, incluindo scheduleReview", () => {
    const input = {
      subjectId: "s1",
      topicId: null,
      blockId: "b1",
      cycleId: "c1",
      cycleRound: 2,
      type: "questoes" as const,
      startedAt: "2026-01-01T10:00:00.000Z",
      durationMin: 45,
      questionsTotal: 20,
      questionsCorrect: 15,
      pagesRead: null,
      notes: "boa sessão",
      scheduleReview: true,
    };
    const row = toSessionRow(input, USER_ID);
    const full = { id: "sess1", created_at: "2026-01-01T00:00:00.000Z", ...row };
    expect(fromSessionRow(full)).toEqual({
      id: "sess1",
      subjectId: "s1",
      topicId: null,
      blockId: "b1",
      cycleId: "c1",
      cycleRound: 2,
      type: "questoes",
      startedAt: "2026-01-01T10:00:00.000Z",
      durationMin: 45,
      questionsTotal: 20,
      questionsCorrect: 15,
      pagesRead: null,
      notes: "boa sessão",
      scheduleReview: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("campos opcionais nulos (questões/páginas/vínculos) são preservados", () => {
    const row = toSessionRow(
      {
        subjectId: "s1",
        topicId: null,
        blockId: null,
        cycleId: null,
        cycleRound: null,
        type: "teoria",
        startedAt: "2026-01-01T10:00:00.000Z",
        durationMin: 30,
        questionsTotal: null,
        questionsCorrect: null,
        pagesRead: 12,
        notes: null,
        scheduleReview: false,
      },
      USER_ID,
    );
    expect(row.block_id).toBeNull();
    expect(row.cycle_id).toBeNull();
    expect(row.cycle_round).toBeNull();
    expect(row.questions_total).toBeNull();
    expect(row.pages_read).toBe(12);
  });
});

describe("reviews mapper", () => {
  it("ida-e-volta sem perda de dados", () => {
    const input = {
      sessionId: "sess1",
      subjectId: "s1",
      topicId: "t1",
      step: 2 as const,
      dueDate: "2026-01-08",
      status: "pending" as const,
      completedAt: null,
    };
    const row = toReviewRow(input, USER_ID);
    const full = { id: "r1", created_at: "2026-01-01T00:00:00.000Z", ...row };
    expect(fromReviewRow(full)).toEqual({
      id: "r1",
      sessionId: "sess1",
      subjectId: "s1",
      topicId: "t1",
      step: 2,
      dueDate: "2026-01-08",
      status: "pending",
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("annotations mapper", () => {
  it("ida-e-volta sem perda de dados", () => {
    const input = { subjectId: "s1", topicId: null, title: "Nota", content: "# md" };
    const row = toAnnotationRow(input, USER_ID);
    const full = { id: "a1", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-02T00:00:00.000Z", ...row };
    expect(fromAnnotationRow(full)).toEqual({
      id: "a1",
      subjectId: "s1",
      topicId: null,
      title: "Nota",
      content: "# md",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });
});

describe("profile mapper", () => {
  it("ida-e-volta sem perda de dados", () => {
    const row = toProfileRow({ displayName: "Fulano", targetExam: "TRT-15", examDate: "2026-12-01" });
    const full = { id: "u1", created_at: "2026-01-01T00:00:00.000Z", ...row };
    expect(fromProfileRow(full)).toEqual({
      id: "u1",
      displayName: "Fulano",
      targetExam: "TRT-15",
      examDate: "2026-12-01",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("campos nulos preservados", () => {
    const row = toProfileRow({ displayName: null, targetExam: null, examDate: null });
    expect(row).toEqual({ display_name: null, target_exam: null, exam_date: null });
  });
});
