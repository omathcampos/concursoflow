import { beforeEach, describe, expect, it } from "vitest";

import { useLocalStore } from "@/lib/data/local/store";
import { createLocalRepository } from "@/lib/data/local/local-repository";
import type { Session } from "@/lib/data/types";

function repo() {
  return createLocalRepository(useLocalStore.getState());
}

beforeEach(() => {
  localStorage.clear();
  useLocalStore.setState(useLocalStore.getInitialState(), true);
});

describe("LocalRepository — subjects", () => {
  it("cria, lista, atualiza e remove uma matéria", async () => {
    const created = await repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    expect(created.id).toBeTruthy();
    expect(repo().subjects.list()).toHaveLength(1);

    const updated = await repo().subjects.update(created.id, { weight: 5 });
    expect(updated.weight).toBe(5);
    expect(repo().subjects.get(created.id)?.weight).toBe(5);

    await repo().subjects.remove(created.id);
    expect(repo().subjects.list()).toHaveLength(0);
  });

  it("remover matéria também remove seus tópicos e entradas de ciclo", async () => {
    const subject = await repo().subjects.create({ name: "RLM", color: "#3b82f6", weight: 2, notes: null });
    await repo().topics.create({ subjectId: subject.id, name: "Proposições", status: "not_started", position: 0, notes: null });
    await repo().cycle.setup("Meu ciclo", [{ subjectId: subject.id, targetMinutes: 60 }]);

    await repo().subjects.remove(subject.id);

    expect(repo().topics.list()).toHaveLength(0);
    const cycle = repo().cycle.getActive();
    expect(cycle).toBeDefined();
    expect(repo().cycle.entries(cycle!.id)).toHaveLength(0);
  });

  it("persiste no localStorage", async () => {
    await repo().subjects.create({ name: "Direito Adm", color: "#10b981", weight: 4, notes: null });
    const raw = localStorage.getItem("concursoflow-v1");
    expect(raw).toBeTruthy();
    expect(raw).toContain("Direito Adm");
  });
});

describe("LocalRepository — topics", () => {
  it("cria tópicos vinculados a uma matéria e atualiza status", async () => {
    const subject = await repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    const topic = await repo().topics.create({ subjectId: subject.id, name: "Crase", status: "not_started", position: 0, notes: null });

    const updated = await repo().topics.update(topic.id, { status: "studying" });
    expect(updated.status).toBe("studying");

    await repo().topics.remove(topic.id);
    expect(repo().topics.list()).toHaveLength(0);
  });
});

describe("LocalRepository — annotations", () => {
  it("cria anotação avulsa e vinculada, e remove ao excluir a matéria vinculada (set null)", async () => {
    const subject = await repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    const linked = await repo().annotations.create({
      title: "Regra de crase",
      content: "# nota",
      subjectId: subject.id,
      topicId: null,
    });

    await repo().subjects.remove(subject.id);

    const persisted = repo().annotations.get(linked.id);
    expect(persisted).toBeDefined();
    expect(persisted?.subjectId).toBeNull();
  });
});

function makeSession(overrides: Partial<Omit<Session, "id" | "createdAt">> & { subjectId: string }) {
  return repo().sessions.create({
    topicId: null,
    blockId: null,
    cycleId: null,
    cycleRound: null,
    type: "teoria",
    startedAt: "2026-03-02T19:00:00.000Z",
    durationMin: 30,
    questionsTotal: null,
    questionsCorrect: null,
    pagesRead: null,
    notes: null,
    scheduleReview: false,
    ...overrides,
  });
}

describe("LocalRepository — cycle (progresso derivado de sessões)", () => {
  it("progresso começa em zero ao configurar o ciclo", async () => {
    const a = await repo().subjects.create({ name: "A", color: "#8b5cf6", weight: 3, notes: null });
    const cycle = await repo().cycle.setup("Ciclo principal", [{ subjectId: a.id, targetMinutes: 60 }]);
    expect(repo().cycle.entries(cycle.id)[0].doneMinutes).toBe(0);
  });

  it("sessão vinculada ao ciclo/rodada soma no progresso da matéria", async () => {
    const a = await repo().subjects.create({ name: "A", color: "#8b5cf6", weight: 3, notes: null });
    const b = await repo().subjects.create({ name: "B", color: "#3b82f6", weight: 1, notes: null });
    const cycle = await repo().cycle.setup("Ciclo", [
      { subjectId: a.id, targetMinutes: 60 },
      { subjectId: b.id, targetMinutes: 30 },
    ]);

    await makeSession({ subjectId: a.id, cycleId: cycle.id, cycleRound: cycle.round, durationMin: 60 });
    await makeSession({ subjectId: b.id, cycleId: cycle.id, cycleRound: cycle.round, durationMin: 30 });

    const entries = repo().cycle.entries(cycle.id);
    expect(entries.every((e) => e.doneMinutes >= e.targetMinutes)).toBe(true);
  });

  it("editar a duração da sessão atualiza o progresso; excluir a sessão zera de novo", async () => {
    const a = await repo().subjects.create({ name: "A", color: "#8b5cf6", weight: 3, notes: null });
    const cycle = await repo().cycle.setup("Ciclo", [{ subjectId: a.id, targetMinutes: 60 }]);

    const session = await makeSession({ subjectId: a.id, cycleId: cycle.id, cycleRound: cycle.round, durationMin: 30 });
    expect(repo().cycle.entries(cycle.id)[0].doneMinutes).toBe(30);

    await repo().sessions.update(session.id, { durationMin: 50 });
    expect(repo().cycle.entries(cycle.id)[0].doneMinutes).toBe(50);

    await repo().sessions.remove(session.id);
    expect(repo().cycle.entries(cycle.id)[0].doneMinutes).toBe(0);
  });

  it("sessões sem cycleId/cycleRound (ex.: registro avulso) não contam no progresso do ciclo", async () => {
    const a = await repo().subjects.create({ name: "A", color: "#8b5cf6", weight: 3, notes: null });
    const cycle = await repo().cycle.setup("Ciclo", [{ subjectId: a.id, targetMinutes: 60 }]);

    await makeSession({ subjectId: a.id, durationMin: 45 });

    expect(repo().cycle.entries(cycle.id)[0].doneMinutes).toBe(0);
  });

  it("nova rodada incrementa o número da rodada e zera o progresso (sessões da rodada anterior não contam mais)", async () => {
    const a = await repo().subjects.create({ name: "A", color: "#8b5cf6", weight: 3, notes: null });
    const cycle = await repo().cycle.setup("Ciclo", [{ subjectId: a.id, targetMinutes: 60 }]);
    await makeSession({ subjectId: a.id, cycleId: cycle.id, cycleRound: cycle.round, durationMin: 60 });

    const restarted = await repo().cycle.startNewRound(cycle.id);
    expect(restarted.round).toBe(2);
    expect(repo().cycle.entries(cycle.id)[0].doneMinutes).toBe(0);
  });
});

describe("LocalRepository — sessions", () => {
  it("cria, atualiza e remove uma sessão", async () => {
    const subject = await repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    const session = await makeSession({ subjectId: subject.id, questionsTotal: 20, questionsCorrect: 15 });

    expect(repo().sessions.list()).toHaveLength(1);

    const updated = await repo().sessions.update(session.id, { questionsCorrect: 18 });
    expect(updated.questionsCorrect).toBe(18);

    await repo().sessions.remove(session.id);
    expect(repo().sessions.list()).toHaveLength(0);
  });

  it("remover matéria remove suas sessões; remover tópico apenas desvincula (set null)", async () => {
    const subject = await repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    const topic = await repo().topics.create({ subjectId: subject.id, name: "Crase", status: "not_started", position: 0, notes: null });
    const session = await makeSession({ subjectId: subject.id, topicId: topic.id });

    await repo().topics.remove(topic.id);
    expect(repo().sessions.get(session.id)?.topicId).toBeNull();

    await repo().subjects.remove(subject.id);
    expect(repo().sessions.list()).toHaveLength(0);
  });

  it("remover um bloco desvincula (set null) as sessões ligadas a ele", async () => {
    const subject = await repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    const block = await repo().blocks.create({
      subjectId: subject.id,
      topicId: null,
      type: "teoria",
      status: "done",
      startAt: "2026-03-02T19:00:00.000Z",
      endAt: "2026-03-02T20:00:00.000Z",
      recurrenceRule: null,
      notes: null,
    });
    const session = await makeSession({ subjectId: subject.id, blockId: block.id });

    await repo().blocks.remove(block.id);
    expect(repo().sessions.get(session.id)?.blockId).toBeNull();
  });
});

describe("LocalRepository — blocks", () => {
  function makeSubject() {
    return repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
  }

  it("cria, atualiza e remove um bloco avulso", async () => {
    const subject = await makeSubject();
    const block = await repo().blocks.create({
      subjectId: subject.id,
      topicId: null,
      type: "teoria",
      status: "planned",
      startAt: "2026-03-02T19:00:00.000Z",
      endAt: "2026-03-02T21:00:00.000Z",
      recurrenceRule: null,
      notes: null,
    });
    expect(repo().blocks.list()).toHaveLength(1);

    const updated = await repo().blocks.update(block.id, { status: "done" });
    expect(updated.status).toBe("done");

    await repo().blocks.remove(block.id);
    expect(repo().blocks.list()).toHaveLength(0);
  });

  it("remover matéria também remove seus blocos", async () => {
    const subject = await makeSubject();
    await repo().blocks.create({
      subjectId: subject.id,
      topicId: null,
      type: "teoria",
      status: "planned",
      startAt: "2026-03-02T19:00:00.000Z",
      endAt: "2026-03-02T21:00:00.000Z",
      recurrenceRule: null,
      notes: null,
    });

    await repo().subjects.remove(subject.id);

    expect(repo().blocks.list()).toHaveLength(0);
  });

  it("createSeries gera N ocorrências semanais com a mesma recurrenceRule", async () => {
    const subject = await makeSubject();
    const series = await repo().blocks.createSeries(
      {
        subjectId: subject.id,
        topicId: null,
        type: "teoria",
        status: "planned",
        startAt: "2026-03-02T19:00:00.000Z",
        endAt: "2026-03-02T21:00:00.000Z",
        notes: null,
      },
      8,
    );

    expect(series).toHaveLength(8);
    expect(new Set(series.map((b) => b.recurrenceRule)).size).toBe(1);
    expect(series[0].recurrenceRule).toBeTruthy();
    expect(series[1].startAt).toBe("2026-03-09T19:00:00.000Z");
  });

  it("removeSeries com scope 'this' remove só a ocorrência", async () => {
    const subject = await makeSubject();
    const series = await repo().blocks.createSeries(
      {
        subjectId: subject.id,
        topicId: null,
        type: "teoria",
        status: "planned",
        startAt: "2026-03-02T19:00:00.000Z",
        endAt: "2026-03-02T21:00:00.000Z",
        notes: null,
      },
      4,
    );

    await repo().blocks.removeSeries(series[1].id, "this");

    expect(repo().blocks.list()).toHaveLength(3);
    expect(repo().blocks.get(series[0].id)).toBeDefined();
    expect(repo().blocks.get(series[2].id)).toBeDefined();
  });

  it("removeSeries com scope 'future' remove esta e as futuras, preservando as passadas", async () => {
    const subject = await makeSubject();
    const series = await repo().blocks.createSeries(
      {
        subjectId: subject.id,
        topicId: null,
        type: "teoria",
        status: "planned",
        startAt: "2026-03-02T19:00:00.000Z",
        endAt: "2026-03-02T21:00:00.000Z",
        notes: null,
      },
      4,
    );

    await repo().blocks.removeSeries(series[1].id, "future");

    const remaining = repo().blocks.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(series[0].id);
  });
});

describe("LocalRepository — reviews (agendamento automático via sessão)", () => {
  async function makeSubjectWithTopic() {
    const subject = await repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    const topic = await repo().topics.create({
      subjectId: subject.id,
      name: "Crase",
      status: "not_started",
      position: 0,
      notes: null,
    });
    return { subject, topic };
  }

  it("sessão com opt-in cria a revisão step 1 (D+1)", async () => {
    const { subject, topic } = await makeSubjectWithTopic();
    const session = await makeSession({ subjectId: subject.id, topicId: topic.id, scheduleReview: true });

    const reviews = repo().reviews.list();
    expect(reviews).toHaveLength(1);
    expect(reviews[0].step).toBe(1);
    expect(reviews[0].status).toBe("pending");
    expect(reviews[0].sessionId).toBe(session.id);
    expect(reviews[0].topicId).toBe(topic.id);
  });

  it("sessão sem opt-in não cria revisão", async () => {
    const { subject } = await makeSubjectWithTopic();
    await makeSession({ subjectId: subject.id, scheduleReview: false });
    expect(repo().reviews.list()).toHaveLength(0);
  });

  it("concluir a revisão marca done e agenda a próxima do ciclo", async () => {
    const { subject, topic } = await makeSubjectWithTopic();
    await makeSession({ subjectId: subject.id, topicId: topic.id, scheduleReview: true });
    const [first] = repo().reviews.list();

    await repo().reviews.complete(first.id);

    const all = repo().reviews.list();
    expect(all).toHaveLength(2);
    const completed = all.find((r) => r.id === first.id)!;
    expect(completed.status).toBe("done");
    expect(completed.completedAt).toBeTruthy();
    const next = all.find((r) => r.id !== first.id)!;
    expect(next.step).toBe(2);
    expect(next.status).toBe("pending");
  });

  it("concluir a revisão step 3 encerra o ciclo (nenhuma nova revisão)", async () => {
    const { subject } = await makeSubjectWithTopic();
    await makeSession({ subjectId: subject.id, scheduleReview: true });
    let [review] = repo().reviews.list();

    await repo().reviews.complete(review.id); // -> step 2
    review = repo().reviews.list().find((r) => r.status === "pending")!;
    await repo().reviews.complete(review.id); // -> step 3
    review = repo().reviews.list().find((r) => r.status === "pending")!;
    await repo().reviews.complete(review.id); // -> encerra

    const pending = repo().reviews.list().filter((r) => r.status === "pending");
    expect(pending).toHaveLength(0);
  });

  it("pular a revisão marca skipped e não agenda a próxima", async () => {
    const { subject } = await makeSubjectWithTopic();
    await makeSession({ subjectId: subject.id, scheduleReview: true });
    const [review] = repo().reviews.list();

    await repo().reviews.skip(review.id);

    const all = repo().reviews.list();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("skipped");
  });

  it("remover a matéria remove as revisões; remover o tópico só desvincula", async () => {
    const { subject, topic } = await makeSubjectWithTopic();
    await makeSession({ subjectId: subject.id, topicId: topic.id, scheduleReview: true });

    await repo().topics.remove(topic.id);
    expect(repo().reviews.list()[0].topicId).toBeNull();

    await repo().subjects.remove(subject.id);
    expect(repo().reviews.list()).toHaveLength(0);
  });
});

describe("LocalRepository — profile", () => {
  it("começa vazio e atualiza parcialmente preservando os demais campos", async () => {
    expect(repo().profile.get()).toMatchObject({ displayName: null, targetExam: null, examDate: null });

    await repo().profile.update({ targetExam: "TRT-15", examDate: "2026-12-01" });
    expect(repo().profile.get()).toMatchObject({ targetExam: "TRT-15", examDate: "2026-12-01", displayName: null });

    await repo().profile.update({ displayName: "Fulano" });
    expect(repo().profile.get()).toMatchObject({ targetExam: "TRT-15", examDate: "2026-12-01", displayName: "Fulano" });
  });
});
