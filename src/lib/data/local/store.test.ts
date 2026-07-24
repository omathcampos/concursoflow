import { beforeEach, describe, expect, it } from "vitest";

import { useLocalStore } from "@/lib/data/local/store";
import { createLocalRepository } from "@/lib/data/local/local-repository";

function repo() {
  return createLocalRepository(useLocalStore.getState());
}

beforeEach(() => {
  localStorage.clear();
  useLocalStore.setState(useLocalStore.getInitialState(), true);
});

describe("LocalRepository — subjects", () => {
  it("cria, lista, atualiza e remove uma matéria", () => {
    const created = repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    expect(created.id).toBeTruthy();
    expect(repo().subjects.list()).toHaveLength(1);

    const updated = repo().subjects.update(created.id, { weight: 5 });
    expect(updated.weight).toBe(5);
    expect(repo().subjects.get(created.id)?.weight).toBe(5);

    repo().subjects.remove(created.id);
    expect(repo().subjects.list()).toHaveLength(0);
  });

  it("remover matéria também remove seus tópicos e entradas de ciclo", () => {
    const subject = repo().subjects.create({ name: "RLM", color: "#3b82f6", weight: 2, notes: null });
    repo().topics.create({ subjectId: subject.id, name: "Proposições", status: "not_started", position: 0, notes: null });
    repo().cycle.setup("Meu ciclo", [{ subjectId: subject.id, targetMinutes: 60 }]);

    repo().subjects.remove(subject.id);

    expect(repo().topics.list()).toHaveLength(0);
    const cycle = repo().cycle.getActive();
    expect(cycle).toBeDefined();
    expect(repo().cycle.entries(cycle!.id)).toHaveLength(0);
  });

  it("persiste no localStorage", () => {
    repo().subjects.create({ name: "Direito Adm", color: "#10b981", weight: 4, notes: null });
    const raw = localStorage.getItem("concursoflow-v1");
    expect(raw).toBeTruthy();
    expect(raw).toContain("Direito Adm");
  });
});

describe("LocalRepository — topics", () => {
  it("cria tópicos vinculados a uma matéria e atualiza status", () => {
    const subject = repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    const topic = repo().topics.create({ subjectId: subject.id, name: "Crase", status: "not_started", position: 0, notes: null });

    const updated = repo().topics.update(topic.id, { status: "studying" });
    expect(updated.status).toBe("studying");

    repo().topics.remove(topic.id);
    expect(repo().topics.list()).toHaveLength(0);
  });
});

describe("LocalRepository — annotations", () => {
  it("cria anotação avulsa e vinculada, e remove ao excluir a matéria vinculada (set null)", () => {
    const subject = repo().subjects.create({ name: "Português", color: "#8b5cf6", weight: 3, notes: null });
    const linked = repo().annotations.create({
      title: "Regra de crase",
      content: "# nota",
      subjectId: subject.id,
      topicId: null,
    });

    repo().subjects.remove(subject.id);

    const persisted = repo().annotations.get(linked.id);
    expect(persisted).toBeDefined();
    expect(persisted?.subjectId).toBeNull();
  });
});

describe("LocalRepository — cycle", () => {
  it("configura o ciclo, adiciona progresso e detecta rodada completa", () => {
    const a = repo().subjects.create({ name: "A", color: "#8b5cf6", weight: 3, notes: null });
    const b = repo().subjects.create({ name: "B", color: "#3b82f6", weight: 1, notes: null });

    const cycle = repo().cycle.setup("Ciclo principal", [
      { subjectId: a.id, targetMinutes: 60 },
      { subjectId: b.id, targetMinutes: 30 },
    ]);
    expect(cycle.round).toBe(1);
    expect(repo().cycle.entries(cycle.id)).toHaveLength(2);

    repo().cycle.addProgress(cycle.id, a.id, 60);
    repo().cycle.addProgress(cycle.id, b.id, 30);

    const entries = repo().cycle.entries(cycle.id);
    expect(entries.every((e) => e.doneMinutes >= e.targetMinutes)).toBe(true);
  });

  it("nova rodada zera o progresso e incrementa o número da rodada", () => {
    const a = repo().subjects.create({ name: "A", color: "#8b5cf6", weight: 3, notes: null });
    const cycle = repo().cycle.setup("Ciclo", [{ subjectId: a.id, targetMinutes: 60 }]);
    repo().cycle.addProgress(cycle.id, a.id, 60);

    const restarted = repo().cycle.startNewRound(cycle.id);
    expect(restarted.round).toBe(2);
    expect(repo().cycle.entries(cycle.id).every((e) => e.doneMinutes === 0)).toBe(true);
  });
});
