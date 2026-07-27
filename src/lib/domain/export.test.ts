import { format } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  buildBlocosTable,
  buildEvolucaoSemanalTable,
  buildGradeCalendario,
  buildResumoSheet,
  buildRevisoesTable,
  buildSessoesTable,
  resolveExportRange,
} from "@/lib/domain/export";
import type { Block, CycleEntry, Review, Session, Subject, Topic } from "@/lib/data/types";

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

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "top-1",
    subjectId: "sub-1",
    name: "Controle de constitucionalidade",
    status: "studying",
    position: 0,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-1",
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

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "block-1",
    subjectId: "sub-1",
    topicId: null,
    type: "teoria",
    status: "planned",
    startAt: "2026-07-28T19:30:00.000Z",
    endAt: "2026-07-28T20:50:00.000Z",
    recurrenceRule: null,
    notes: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "rev-1",
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

function makeCycleEntry(overrides: Partial<CycleEntry> = {}): CycleEntry {
  return {
    id: "ce-1",
    cycleId: "cycle-1",
    subjectId: "sub-1",
    targetMinutes: 300,
    doneMinutes: 60,
    ...overrides,
  };
}

const NOW = new Date("2026-07-24T15:00:00"); // sexta-feira, local

describe("resolveExportRange", () => {
  it("30d: from é 29 dias antes de now, to é now", () => {
    const range = resolveExportRange({ kind: "30d" }, NOW);
    expect(range.from).not.toBeNull();
    expect(range.to).not.toBeNull();
    expect(range.to!.getTime()).toBeGreaterThanOrEqual(NOW.getTime() - 1000);
  });

  it("all: from é null (sem limite inferior)", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    expect(range.from).toBeNull();
  });

  it("custom: usa exatamente o intervalo informado", () => {
    const range = resolveExportRange({ kind: "custom", from: "2026-01-01", to: "2026-01-31" }, NOW);
    expect(range.from ? format(range.from, "yyyy-MM-dd") : null).toBe("2026-01-01");
    expect(range.to ? format(range.to, "yyyy-MM-dd") : null).toBe("2026-01-31");
  });
});

describe("buildResumoSheet", () => {
  it("sem dados: overview zerado e tabela vazia, sem quebrar", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const result = buildResumoSheet({ sessions: [], subjects: [makeSubject()], cycleEntries: [], range, now: NOW });
    expect(result.table.rows).toHaveLength(0);
    const totalHoras = result.overview.find((o) => o.label === "Total de horas");
    expect(totalHoras?.value).toBe(0);
  });

  it("% de acerto geral é null (exibido como '-') quando não há questões", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const sessions = [makeSession({ questionsTotal: null })];
    const result = buildResumoSheet({ sessions, subjects: [makeSubject()], cycleEntries: [], range, now: NOW });
    const acerto = result.overview.find((o) => o.label === "% de acerto geral");
    expect(acerto?.value).toBe("-");
  });

  it("tabela por matéria calcula horas, sessões, questões e % do ciclo sem dividir por zero", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const subject = makeSubject();
    const sessions = [
      makeSession({ id: "a", durationMin: 60, questionsTotal: 10, questionsCorrect: 7 }),
      makeSession({ id: "b", durationMin: 30, questionsTotal: null, questionsCorrect: null }),
    ];
    const cycleEntries = [makeCycleEntry({ subjectId: subject.id, targetMinutes: 300, doneMinutes: 90 })];
    const result = buildResumoSheet({ sessions, subjects: [subject], cycleEntries, range, now: NOW });
    const row = result.table.rows[0];
    // colunas: Matéria, Horas, Sessões, Questões feitas, Acertos, % acerto, Horas-alvo, % do ciclo
    expect(row[0]).toBe("Direito Constitucional");
    expect(row[1]).toBe(1.5); // 90min = 1.5h
    expect(row[2]).toBe(2);
    expect(row[3]).toBe(10);
    expect(row[4]).toBe(7);
    expect(row[5]).toBe(0.7); // percent como fração 0-1 (formatação % no SheetJS)
    expect(row[6]).toBe(5); // 300min = 5h
    expect(row[7]).toBe(0.3); // 90/300
  });

  it("matéria sem cycle_entry: % do ciclo e horas-alvo ficam '-' em vez de dividir por zero", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const subject = makeSubject();
    const sessions = [makeSession({ durationMin: 60 })];
    const result = buildResumoSheet({ sessions, subjects: [subject], cycleEntries: [], range, now: NOW });
    const row = result.table.rows[0];
    expect(row[6]).toBe("-");
    expect(row[7]).toBe("-");
  });
});

describe("buildSessoesTable", () => {
  it("sem dados retorna tabela vazia", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const result = buildSessoesTable([], [makeSubject()], [], range);
    expect(result.rows).toHaveLength(0);
  });

  it("sessão sem questões deixa colunas de questões vazias (não zero)", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const session = makeSession({ questionsTotal: null, questionsCorrect: null, pagesRead: null });
    const result = buildSessoesTable([session], [makeSubject()], [], range);
    const row = result.rows[0];
    const questionsIdx = result.columns.findIndex((c) => c.header === "Questões feitas");
    const accuracyIdx = result.columns.findIndex((c) => c.header === "% acerto");
    expect(row[questionsIdx]).toBeNull();
    expect(row[accuracyIdx]).toBeNull();
  });

  it("resolve nome da matéria e do tópico", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const subject = makeSubject();
    const topic = makeTopic();
    const session = makeSession({ topicId: topic.id });
    const result = buildSessoesTable([session], [subject], [topic], range);
    const subjectIdx = result.columns.findIndex((c) => c.header === "Matéria");
    const topicIdx = result.columns.findIndex((c) => c.header === "Tópico");
    expect(result.rows[0][subjectIdx]).toBe("Direito Constitucional");
    expect(result.rows[0][topicIdx]).toBe("Controle de constitucionalidade");
  });

  it("filtra pelo período informado", () => {
    const range = resolveExportRange({ kind: "custom", from: "2026-07-01", to: "2026-07-10" }, NOW);
    const sessions = [
      makeSession({ id: "in", startedAt: "2026-07-05T10:00:00.000Z" }),
      makeSession({ id: "out", startedAt: "2026-07-20T10:00:00.000Z" }),
    ];
    const result = buildSessoesTable(sessions, [makeSubject()], [], range);
    expect(result.rows).toHaveLength(1);
  });
});

describe("buildBlocosTable", () => {
  it("sem dados retorna tabela vazia", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    expect(buildBlocosTable([], [makeSubject()], [], range).rows).toHaveLength(0);
  });

  it("marca recorrente sim/não pela presença de recurrence_rule", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const blocks = [makeBlock({ id: "a", recurrenceRule: "WEEKLY:uuid" }), makeBlock({ id: "b", recurrenceRule: null })];
    const result = buildBlocosTable(blocks, [makeSubject()], [], range);
    const recIdx = result.columns.findIndex((c) => c.header === "Recorrente");
    expect(result.rows[0][recIdx]).toBe("Sim");
    expect(result.rows[1][recIdx]).toBe("Não");
  });
});

describe("buildRevisoesTable", () => {
  it("sem dados retorna tabela vazia", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    expect(buildRevisoesTable([], [makeSubject()], [], range, NOW).rows).toHaveLength(0);
  });

  it("revisão pendente vencida calcula dias de atraso; em dia fica 0", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const reviews = [
      makeReview({ id: "late", dueDate: "2026-07-20", status: "pending" }), // 4 dias atrás de NOW (24/07)
      makeReview({ id: "ontime", dueDate: "2026-07-24", status: "pending" }),
    ];
    const result = buildRevisoesTable(reviews, [makeSubject()], [], range, NOW);
    const lateIdx = result.columns.findIndex((c) => c.header === "Dias de atraso");
    expect(result.rows[0][lateIdx]).toBe(4);
    expect(result.rows[1][lateIdx]).toBe(0);
  });

  it("revisão concluída não conta atraso (dias de atraso null)", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    const reviews = [makeReview({ status: "done", completedAt: "2026-07-21T10:00:00.000Z", dueDate: "2026-07-20" })];
    const result = buildRevisoesTable(reviews, [makeSubject()], [], range, NOW);
    const lateIdx = result.columns.findIndex((c) => c.header === "Dias de atraso");
    expect(result.rows[0][lateIdx]).toBeNull();
  });
});

describe("buildEvolucaoSemanalTable", () => {
  it("sem dados ainda gera as semanas do período, com horas zeradas", () => {
    const range = resolveExportRange({ kind: "custom", from: "2026-07-06", to: "2026-07-19" }, NOW);
    const result = buildEvolucaoSemanalTable([], [makeSubject()], range, NOW);
    expect(result.rows.length).toBeGreaterThan(0);
    const horasIdx = result.columns.findIndex((c) => c.header === "Horas totais");
    expect(result.rows[0][horasIdx]).toBe(0);
  });

  it("agrupa corretamente semanas ISO na virada de ano", () => {
    // 2025-12-29 (segunda) começa a última semana ISO de 2025/primeira de 2026
    const range = resolveExportRange({ kind: "custom", from: "2025-12-22", to: "2026-01-04" }, NOW);
    const sessions = [
      makeSession({ id: "a", startedAt: "2025-12-30T10:00:00.000Z", durationMin: 60 }), // semana de 29/12
      makeSession({ id: "b", startedAt: "2026-01-02T10:00:00.000Z", durationMin: 30 }), // semana seguinte
    ];
    const result = buildEvolucaoSemanalTable(sessions, [makeSubject()], range, NOW);
    const horasIdx = result.columns.findIndex((c) => c.header === "Horas totais");
    const total = result.rows.reduce((sum, row) => sum + (row[horasIdx] as number), 0);
    expect(total).toBe(1.5);
    expect(result.rows.length).toBeGreaterThanOrEqual(2);
  });

  it("% de acerto null quando a semana não tem questões respondidas", () => {
    const range = resolveExportRange({ kind: "custom", from: "2026-07-06", to: "2026-07-12" }, NOW);
    const sessions = [makeSession({ startedAt: "2026-07-07T10:00:00.000Z", questionsTotal: null })];
    const result = buildEvolucaoSemanalTable(sessions, [makeSubject()], range, NOW);
    const accIdx = result.columns.findIndex((c) => c.header === "% acerto");
    expect(result.rows[0][accIdx]).toBeNull();
  });
});

describe("buildGradeCalendario", () => {
  it("sem blocos retorna nenhuma seção", () => {
    const range = resolveExportRange({ kind: "all" }, NOW);
    expect(buildGradeCalendario([], [makeSubject()], [], range)).toHaveLength(0);
  });

  it("cria uma seção por semana com o bloco posicionado no dia/horário certo", () => {
    const range = resolveExportRange({ kind: "custom", from: "2026-07-27", to: "2026-08-02" }, NOW);
    const subject = makeSubject();
    // terça-feira 28/07, 19:30 (horário local do bloco é UTC no fixture)
    const block = makeBlock({ subjectId: subject.id, startAt: "2026-07-28T19:30:00.000Z", endAt: "2026-07-28T20:50:00.000Z" });
    const sections = buildGradeCalendario([block], [subject], [], range);
    expect(sections).toHaveLength(1);
    const flatCells = sections[0].grid.flat().filter((c) => c !== null);
    expect(flatCells).toHaveLength(1);
    expect(flatCells[0]?.subjectName).toBe("Direito Constitucional");
  });

  it("bloco concluído e pulado ficam marcados no status da célula", () => {
    const range = resolveExportRange({ kind: "custom", from: "2026-07-27", to: "2026-08-02" }, NOW);
    const subject = makeSubject();
    const blocks = [
      makeBlock({ id: "done", status: "done", subjectId: subject.id, startAt: "2026-07-28T19:30:00.000Z", endAt: "2026-07-28T20:50:00.000Z" }),
      makeBlock({ id: "skipped", status: "skipped", subjectId: subject.id, startAt: "2026-07-29T19:30:00.000Z", endAt: "2026-07-29T20:50:00.000Z" }),
    ];
    const sections = buildGradeCalendario(blocks, [subject], [], range);
    const cells = sections[0].grid.flat().filter((c) => c !== null);
    expect(cells.some((c) => c?.status === "done")).toBe(true);
    expect(cells.some((c) => c?.status === "skipped")).toBe(true);
  });
});
