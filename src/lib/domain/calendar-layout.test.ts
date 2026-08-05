import { describe, expect, it } from "vitest";

import { layoutDayItems } from "@/lib/domain/calendar-layout";

describe("layoutDayItems", () => {
  it("sem itens, devolve array vazio", () => {
    expect(layoutDayItems([])).toEqual([]);
  });

  it("um item sozinho ocupa a coluna inteira", () => {
    const result = layoutDayItems([{ id: "a", startAt: "2026-08-10T10:00:00Z", endAt: "2026-08-10T11:00:00Z" }]);
    expect(result).toEqual([{ id: "a", column: 0, columnCount: 1 }]);
  });

  it("itens sequenciais (não sobrepostos) ocupam a coluna inteira cada um", () => {
    const result = layoutDayItems([
      { id: "a", startAt: "2026-08-10T10:00:00Z", endAt: "2026-08-10T11:00:00Z" },
      { id: "b", startAt: "2026-08-10T11:00:00Z", endAt: "2026-08-10T12:00:00Z" },
    ]);
    // Toque nas bordas não conta como sobreposição (mesma regra do detectOverlap).
    expect(result).toEqual(
      expect.arrayContaining([
        { id: "a", column: 0, columnCount: 1 },
        { id: "b", column: 0, columnCount: 1 },
      ]),
    );
  });

  it("dois itens sobrepostos dividem a largura em 2 colunas", () => {
    const result = layoutDayItems([
      { id: "block", startAt: "2026-08-10T10:00:00Z", endAt: "2026-08-10T11:00:00Z" },
      { id: "session", startAt: "2026-08-10T10:30:00Z", endAt: "2026-08-10T11:30:00Z" },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.block.columnCount).toBe(2);
    expect(byId.session.columnCount).toBe(2);
    expect(byId.block.column).not.toBe(byId.session.column);
  });

  it("três itens todos sobrepostos no mesmo horário dividem em 3 colunas", () => {
    const result = layoutDayItems([
      { id: "a", startAt: "2026-08-10T10:00:00Z", endAt: "2026-08-10T11:00:00Z" },
      { id: "b", startAt: "2026-08-10T10:00:00Z", endAt: "2026-08-10T11:00:00Z" },
      { id: "c", startAt: "2026-08-10T10:00:00Z", endAt: "2026-08-10T11:00:00Z" },
    ]);
    const columns = new Set(result.map((r) => r.column));
    expect(columns.size).toBe(3);
    expect(result.every((r) => r.columnCount === 3)).toBe(true);
  });

  it("clusters independentes (sem sobreposição entre si) têm larguras calculadas separadamente", () => {
    const result = layoutDayItems([
      { id: "a", startAt: "2026-08-10T08:00:00Z", endAt: "2026-08-10T09:00:00Z" },
      { id: "b", startAt: "2026-08-10T08:00:00Z", endAt: "2026-08-10T09:00:00Z" },
      { id: "c", startAt: "2026-08-10T20:00:00Z", endAt: "2026-08-10T21:00:00Z" },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
    expect(byId.c.columnCount).toBe(1);
  });
});
