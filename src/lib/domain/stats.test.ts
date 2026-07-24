import { describe, expect, it } from "vitest";

import {
  accuracyLast30Days,
  computeStreak,
  filterSessionsByPeriod,
  hoursByDayLast14,
  hoursBySubject,
  minutesThisWeek,
  minutesToday,
  questionsPerformanceBySubject,
  studyTypeDistribution,
  topOverdueSubjects,
  weekOverWeekDelta,
  weeklyEvolution,
} from "@/lib/domain/stats";
import type { Review, Session, Subject } from "@/lib/data/types";

function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: "sub-1",
    name: "Direito Constitucional",
    color: "#3b82f6",
    weight: 3,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    subjectId: "sub-1",
    topicId: null,
    blockId: null,
    cycleId: null,
    cycleRound: null,
    type: "teoria",
    startedAt: "2026-07-24T10:00:00.000Z",
    durationMin: 60,
    questionsTotal: null,
    questionsCorrect: null,
    pagesRead: null,
    notes: null,
    scheduleReview: false,
    createdAt: "2026-07-24T10:00:00.000Z",
    ...overrides,
  };
}

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: crypto.randomUUID(),
    sessionId: null,
    subjectId: "sub-1",
    topicId: null,
    step: 1,
    dueDate: "2026-07-20",
    status: "pending",
    completedAt: null,
    createdAt: "2026-07-19T00:00:00.000Z",
    ...overrides,
  };
}

const NOW = new Date("2026-07-24T15:00:00"); // sexta-feira, local

describe("filterSessionsByPeriod", () => {
  const sessions = [
    makeSession({ id: "a", startedAt: new Date("2026-07-24T09:00:00").toISOString() }), // hoje
    makeSession({ id: "b", startedAt: new Date("2026-07-19T09:00:00").toISOString() }), // 5 dias atrás
    makeSession({ id: "c", startedAt: new Date("2026-06-30T09:00:00").toISOString() }), // 24 dias atrás
    makeSession({ id: "d", startedAt: new Date("2026-05-10T09:00:00").toISOString() }), // 75 dias atrás
    makeSession({ id: "e", startedAt: new Date("2025-01-01T09:00:00").toISOString() }), // bem antigo
  ];

  it("7d inclui só os últimos 7 dias", () => {
    const result = filterSessionsByPeriod(sessions, "7d", NOW);
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("30d inclui até 30 dias atrás", () => {
    const result = filterSessionsByPeriod(sessions, "30d", NOW);
    expect(result.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("90d inclui até 90 dias atrás", () => {
    const result = filterSessionsByPeriod(sessions, "90d", NOW);
    expect(result.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("all inclui tudo", () => {
    const result = filterSessionsByPeriod(sessions, "all", NOW);
    expect(result).toHaveLength(5);
  });
});

describe("minutesToday / minutesThisWeek", () => {
  it("soma apenas sessões de hoje", () => {
    const sessions = [
      makeSession({ startedAt: new Date("2026-07-24T08:00:00").toISOString(), durationMin: 30 }),
      makeSession({ startedAt: new Date("2026-07-24T20:00:00").toISOString(), durationMin: 20 }),
      makeSession({ startedAt: new Date("2026-07-23T08:00:00").toISOString(), durationMin: 100 }),
    ];
    expect(minutesToday(sessions, NOW)).toBe(50);
  });

  it("soma sessões da semana (segunda a domingo)", () => {
    const sessions = [
      makeSession({ startedAt: new Date("2026-07-20T08:00:00").toISOString(), durationMin: 60 }), // segunda
      makeSession({ startedAt: new Date("2026-07-24T08:00:00").toISOString(), durationMin: 40 }), // sexta
      makeSession({ startedAt: new Date("2026-07-19T08:00:00").toISOString(), durationMin: 999 }), // domingo anterior
    ];
    expect(minutesThisWeek(sessions, NOW)).toBe(100);
  });
});

describe("weekOverWeekDelta", () => {
  it("calcula variação percentual vs. semana anterior", () => {
    const sessions = [
      makeSession({ startedAt: new Date("2026-07-20T08:00:00").toISOString(), durationMin: 100 }), // esta semana
      makeSession({ startedAt: new Date("2026-07-13T08:00:00").toISOString(), durationMin: 50 }), // semana passada
    ];
    expect(weekOverWeekDelta(sessions, NOW)).toBe(100);
  });

  it("retorna 0 quando ambas as semanas estão zeradas", () => {
    expect(weekOverWeekDelta([], NOW)).toBe(0);
  });

  it("retorna null quando a semana anterior não tem dados mas esta tem", () => {
    const sessions = [makeSession({ startedAt: new Date("2026-07-20T08:00:00").toISOString(), durationMin: 60 })];
    expect(weekOverWeekDelta(sessions, NOW)).toBeNull();
  });
});

describe("accuracyLast30Days", () => {
  it("calcula % de acerto ponderado pelas questões dos últimos 30 dias", () => {
    const sessions = [
      makeSession({ startedAt: new Date("2026-07-20T08:00:00").toISOString(), questionsTotal: 20, questionsCorrect: 15 }),
      makeSession({ startedAt: new Date("2026-07-10T08:00:00").toISOString(), questionsTotal: 10, questionsCorrect: 5 }),
      makeSession({ startedAt: new Date("2026-05-01T08:00:00").toISOString(), questionsTotal: 100, questionsCorrect: 0 }), // fora do período
    ];
    expect(accuracyLast30Days(sessions, NOW)).toBe(67); // 20/30 = 66.67 -> 67
  });

  it("retorna null quando não há questões no período", () => {
    const sessions = [makeSession({ startedAt: new Date("2026-07-20T08:00:00").toISOString(), type: "teoria" })];
    expect(accuracyLast30Days(sessions, NOW)).toBeNull();
  });

  it("retorna null para lista vazia", () => {
    expect(accuracyLast30Days([], NOW)).toBeNull();
  });
});

describe("computeStreak", () => {
  it("hoje sem sessão não quebra: sessões ontem e anteontem -> streak 2", () => {
    const sessions = [
      makeSession({ startedAt: new Date("2026-07-23T08:00:00").toISOString() }), // ontem
      makeSession({ startedAt: new Date("2026-07-22T08:00:00").toISOString() }), // anteontem
    ];
    expect(computeStreak(sessions, NOW)).toBe(2);
  });

  it("inclui hoje quando há sessão hoje", () => {
    const sessions = [
      makeSession({ startedAt: new Date("2026-07-24T08:00:00").toISOString() }),
      makeSession({ startedAt: new Date("2026-07-23T08:00:00").toISOString() }),
    ];
    expect(computeStreak(sessions, NOW)).toBe(2);
  });

  it("buraco no meio quebra o streak", () => {
    const sessions = [
      makeSession({ startedAt: new Date("2026-07-23T08:00:00").toISOString() }), // ontem
      makeSession({ startedAt: new Date("2026-07-20T08:00:00").toISOString() }), // 4 dias atrás — buraco antes
    ];
    expect(computeStreak(sessions, NOW)).toBe(1);
  });

  it("sem sessões retorna 0", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });
});

describe("hoursBySubject", () => {
  const subjects = [makeSubject({ id: "s1", name: "A" }), makeSubject({ id: "s2", name: "B" })];

  it("agrupa e converte para horas, filtra pelo período e ordena desc", () => {
    const sessions = [
      makeSession({ subjectId: "s1", startedAt: new Date("2026-07-24T08:00:00").toISOString(), durationMin: 30 }),
      makeSession({ subjectId: "s2", startedAt: new Date("2026-07-24T08:00:00").toISOString(), durationMin: 120 }),
      makeSession({ subjectId: "s1", startedAt: new Date("2026-05-01T08:00:00").toISOString(), durationMin: 999 }), // fora do período 7d
    ];
    const result = hoursBySubject(sessions, subjects, "7d", NOW);
    expect(result).toEqual([
      { subjectId: "s2", name: "B", color: "#3b82f6", hours: 2 },
      { subjectId: "s1", name: "A", color: "#3b82f6", hours: 0.5 },
    ]);
  });

  it("matérias sem sessões no período não aparecem", () => {
    const result = hoursBySubject([], subjects, "all", NOW);
    expect(result).toEqual([]);
  });
});

describe("hoursByDayLast14", () => {
  it("retorna 14 dias, do mais antigo ao mais recente, com dias sem sessão zerados", () => {
    const subjects = [makeSubject({ id: "s1" })];
    const sessions = [makeSession({ subjectId: "s1", startedAt: NOW.toISOString(), durationMin: 60 })];
    const result = hoursByDayLast14(sessions, subjects, NOW);
    expect(result).toHaveLength(14);
    expect(result[13].date).toBe("2026-07-24");
    expect(result[13].s1).toBe(1);
    expect(result[0].s1).toBe(0);
  });
});

describe("weeklyEvolution", () => {
  it("retorna N semanas com horas e accuracy (null quando sem questões)", () => {
    const sessions = [
      makeSession({ startedAt: new Date("2026-07-20T08:00:00").toISOString(), durationMin: 60 }),
      makeSession({
        startedAt: new Date("2026-07-21T08:00:00").toISOString(),
        questionsTotal: 10,
        questionsCorrect: 8,
      }),
    ];
    const result = weeklyEvolution(sessions, 12, NOW);
    expect(result).toHaveLength(12);
    const lastWeek = result[11];
    expect(lastWeek.hours).toBe(2); // 60min + 60min (default duration) = 120min = 2h
    expect(lastWeek.accuracy).toBe(80);
    expect(result[0].hours).toBe(0);
    expect(result[0].accuracy).toBeNull();
  });
});

describe("studyTypeDistribution", () => {
  it("agrupa minutos por tipo e calcula percentuais", () => {
    const sessions = [
      makeSession({ type: "teoria", durationMin: 60 }),
      makeSession({ type: "questoes", durationMin: 40 }),
    ];
    const result = studyTypeDistribution(sessions);
    expect(result).toEqual([
      { type: "teoria", label: "Teoria", minutes: 60, percent: 60 },
      { type: "questoes", label: "Questões", minutes: 40, percent: 40 },
    ]);
  });

  it("retorna [] para lista vazia", () => {
    expect(studyTypeDistribution([])).toEqual([]);
  });
});

describe("questionsPerformanceBySubject", () => {
  const subjects = [makeSubject({ id: "s1", name: "Alta" }), makeSubject({ id: "s2", name: "Média" }), makeSubject({ id: "s3", name: "Baixa" })];

  it("calcula % e classifica em buckets verde/âmbar/vermelho", () => {
    const sessions = [
      makeSession({ subjectId: "s1", questionsTotal: 10, questionsCorrect: 9 }), // 90% verde
      makeSession({ subjectId: "s2", questionsTotal: 10, questionsCorrect: 7 }), // 70% âmbar
      makeSession({ subjectId: "s3", questionsTotal: 10, questionsCorrect: 3 }), // 30% vermelho
    ];
    const result = questionsPerformanceBySubject(sessions, subjects);
    expect(result).toEqual([
      { subjectId: "s1", name: "Alta", color: "#3b82f6", total: 10, correct: 9, percent: 90, bucket: "green" },
      { subjectId: "s2", name: "Média", color: "#3b82f6", total: 10, correct: 7, percent: 70, bucket: "amber" },
      { subjectId: "s3", name: "Baixa", color: "#3b82f6", total: 10, correct: 3, percent: 30, bucket: "red" },
    ]);
  });

  it("ignora sessões sem questões e matérias sem dados", () => {
    const sessions = [makeSession({ subjectId: "s1", type: "teoria" })];
    expect(questionsPerformanceBySubject(sessions, subjects)).toEqual([]);
  });
});

describe("topOverdueSubjects", () => {
  const subjects = [makeSubject({ id: "s1", name: "Muito atrasada" }), makeSubject({ id: "s2", name: "Pouco atrasada" }), makeSubject({ id: "s3", name: "Em dia" })];

  it("ordena por dias de atraso desc e limita ao top N", () => {
    const reviews = [
      makeReview({ subjectId: "s1", dueDate: "2026-07-10", status: "pending" }), // 14 dias atrasada
      makeReview({ subjectId: "s2", dueDate: "2026-07-22", status: "pending" }), // 2 dias atrasada
      makeReview({ subjectId: "s3", dueDate: "2026-07-24", status: "pending" }), // vence hoje, não atrasada
      makeReview({ subjectId: "s3", dueDate: "2026-07-01", status: "done" }), // concluída, não conta
    ];
    const result = topOverdueSubjects(reviews, subjects, NOW, 3);
    expect(result).toEqual([
      { subjectId: "s1", name: "Muito atrasada", color: "#3b82f6", count: 1, maxDaysLate: 14 },
      { subjectId: "s2", name: "Pouco atrasada", color: "#3b82f6", count: 1, maxDaysLate: 2 },
    ]);
  });

  it("retorna [] quando não há atrasadas", () => {
    expect(topOverdueSubjects([], subjects, NOW, 3)).toEqual([]);
  });
});
