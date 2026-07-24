import { describe, expect, it } from "vitest";

import { DEFAULT_SUBJECT_COLOR, SUBJECT_COLORS } from "@/lib/constants";

describe("SUBJECT_COLORS", () => {
  it("tem exatamente 12 cores", () => {
    expect(SUBJECT_COLORS).toHaveLength(12);
  });

  it("cada cor tem nome e valor hex válido", () => {
    for (const color of SUBJECT_COLORS) {
      expect(color.name).toBeTruthy();
      expect(color.value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("a cor padrão é a primeira da paleta", () => {
    expect(DEFAULT_SUBJECT_COLOR).toBe(SUBJECT_COLORS[0].value);
  });
});
