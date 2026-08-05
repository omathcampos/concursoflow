import { describe, expect, it } from "vitest";

import { computeAutoScrollHour } from "@/lib/domain/calendar-scroll";

describe("computeAutoScrollHour", () => {
  it("sem blocos, usa a hora atual", () => {
    expect(computeAutoScrollHour([], 14)).toBe(14);
  });

  it("com blocos, e a hora atual é ANTES do primeiro bloco: usa a hora atual (é a menor)", () => {
    expect(computeAutoScrollHour([19], 14)).toBe(14);
  });

  it("com blocos, e a hora atual é DEPOIS do primeiro bloco: usa 1h antes do primeiro bloco (é a menor)", () => {
    expect(computeAutoScrollHour([19], 20)).toBe(18);
  });

  it("primeiro bloco é o mais cedo entre vários", () => {
    expect(computeAutoScrollHour([19, 9, 15], 8)).toBe(8);
  });

  it("bloco à meia-noite: 1h antes não fica negativo, clampa em 0", () => {
    expect(computeAutoScrollHour([0], 10)).toBe(0);
  });

  it("dia vazio de madrugada: mostra a hora atual mesmo sendo cedo (não força meia-noite)", () => {
    expect(computeAutoScrollHour([], 3)).toBe(3);
  });

  it("clampa hora atual fora do intervalo 0-23", () => {
    expect(computeAutoScrollHour([], 25)).toBe(23);
    expect(computeAutoScrollHour([], -1)).toBe(0);
  });
});
