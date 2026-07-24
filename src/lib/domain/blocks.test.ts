import { describe, expect, it } from "vitest";

import { detectOverlap, generateWeeklyOccurrences } from "@/lib/domain/blocks";

describe("detectOverlap", () => {
  const existing = [{ id: "a", startAt: "2026-03-02T10:00:00.000Z", endAt: "2026-03-02T11:00:00.000Z" }];

  it("detecta sobreposição parcial (começa antes, termina dentro)", () => {
    expect(detectOverlap(existing, { startAt: "2026-03-02T09:30:00.000Z", endAt: "2026-03-02T10:30:00.000Z" })).toBe(
      true,
    );
  });

  it("detecta bloco totalmente contido em outro", () => {
    expect(detectOverlap(existing, { startAt: "2026-03-02T10:15:00.000Z", endAt: "2026-03-02T10:45:00.000Z" })).toBe(
      true,
    );
  });

  it("não considera sobreposição quando os horários apenas se tocam", () => {
    // Termina exatamente quando o existente começa.
    expect(detectOverlap(existing, { startAt: "2026-03-02T09:00:00.000Z", endAt: "2026-03-02T10:00:00.000Z" })).toBe(
      false,
    );
    // Começa exatamente quando o existente termina.
    expect(detectOverlap(existing, { startAt: "2026-03-02T11:00:00.000Z", endAt: "2026-03-02T12:00:00.000Z" })).toBe(
      false,
    );
  });

  it("não considera sobreposição em dias diferentes", () => {
    expect(detectOverlap(existing, { startAt: "2026-03-03T10:00:00.000Z", endAt: "2026-03-03T11:00:00.000Z" })).toBe(
      false,
    );
  });

  it("ignora o próprio bloco ao editar/mover (exclui pelo id)", () => {
    expect(
      detectOverlap(existing, { id: "a", startAt: "2026-03-02T10:00:00.000Z", endAt: "2026-03-02T11:00:00.000Z" }),
    ).toBe(false);
  });

  it("lista vazia nunca sobrepõe", () => {
    expect(detectOverlap([], { startAt: "2026-03-02T10:00:00.000Z", endAt: "2026-03-02T11:00:00.000Z" })).toBe(false);
  });
});

describe("generateWeeklyOccurrences", () => {
  it("gera o número de ocorrências solicitado, uma por semana, preservando a duração", () => {
    const occurrences = generateWeeklyOccurrences("2026-03-02T19:00:00.000Z", "2026-03-02T21:00:00.000Z", 8);
    expect(occurrences).toHaveLength(8);
    expect(occurrences[0].startAt).toBe("2026-03-02T19:00:00.000Z");
    expect(occurrences[1].startAt).toBe("2026-03-09T19:00:00.000Z");
    for (const occurrence of occurrences) {
      const duration = new Date(occurrence.endAt).getTime() - new Date(occurrence.startAt).getTime();
      expect(duration).toBe(2 * 60 * 60 * 1000);
    }
  });

  it("atravessa virada de mês e de ano corretamente", () => {
    // Segunda-feira 2025-12-29 — a 2ª e a 6ª ocorrência caem em 2026.
    const occurrences = generateWeeklyOccurrences("2025-12-29T19:00:00.000Z", "2025-12-29T20:00:00.000Z", 6);
    expect(occurrences[0].startAt).toBe("2025-12-29T19:00:00.000Z");
    expect(occurrences[1].startAt).toBe("2026-01-05T19:00:00.000Z");
    expect(occurrences[5].startAt).toBe("2026-02-02T19:00:00.000Z");
  });
});
