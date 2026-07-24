import { describe, expect, it } from "vitest";

import { isCycleComplete, suggestNextSubject } from "@/lib/domain/cycle";

describe("suggestNextSubject", () => {
  it("retorna null para ciclo vazio", () => {
    expect(suggestNextSubject([])).toBeNull();
  });

  it("retorna null quando todas as matérias atingiram a meta", () => {
    const result = suggestNextSubject([
      { subjectId: "a", weight: 3, targetMinutes: 60, doneMinutes: 60 },
      { subjectId: "b", weight: 1, targetMinutes: 30, doneMinutes: 45 },
    ]);
    expect(result).toBeNull();
  });

  it("sugere a matéria com menor progresso (done/target)", () => {
    const result = suggestNextSubject([
      { subjectId: "a", weight: 3, targetMinutes: 60, doneMinutes: 30 }, // 50%
      { subjectId: "b", weight: 3, targetMinutes: 60, doneMinutes: 0 }, // 0%
    ]);
    expect(result).toBe("b");
  });

  it("em empate de progresso, prioriza o maior peso", () => {
    const result = suggestNextSubject([
      { subjectId: "peso-baixo", weight: 1, targetMinutes: 60, doneMinutes: 0 },
      { subjectId: "peso-alto", weight: 5, targetMinutes: 60, doneMinutes: 0 },
    ]);
    expect(result).toBe("peso-alto");
  });

  it("ignora matérias sem carga-horária alvo (target 0)", () => {
    const result = suggestNextSubject([
      { subjectId: "sem-meta", weight: 5, targetMinutes: 0, doneMinutes: 0 },
      { subjectId: "com-meta", weight: 1, targetMinutes: 60, doneMinutes: 30 },
    ]);
    expect(result).toBe("com-meta");
  });
});

describe("isCycleComplete", () => {
  it("é falso para ciclo vazio", () => {
    expect(isCycleComplete([])).toBe(false);
  });

  it("é falso se pelo menos uma matéria não atingiu a meta", () => {
    expect(
      isCycleComplete([
        { subjectId: "a", weight: 1, targetMinutes: 60, doneMinutes: 60 },
        { subjectId: "b", weight: 1, targetMinutes: 60, doneMinutes: 59 },
      ]),
    ).toBe(false);
  });

  it("é verdadeiro quando todas atingiram ou passaram a meta", () => {
    expect(
      isCycleComplete([
        { subjectId: "a", weight: 1, targetMinutes: 60, doneMinutes: 60 },
        { subjectId: "b", weight: 1, targetMinutes: 30, doneMinutes: 45 },
      ]),
    ).toBe(true);
  });
});
