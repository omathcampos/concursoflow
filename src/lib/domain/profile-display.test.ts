import { describe, expect, it } from "vitest";

import { initialsFor } from "@/lib/domain/profile-display";

describe("initialsFor", () => {
  it("usa a 1ª letra do primeiro e do segundo nome", () => {
    expect(initialsFor("Fulano de Tal", "fulano@example.com")).toBe("FD");
  });

  it("usa só a 1ª letra quando há apenas um nome", () => {
    expect(initialsFor("Fulano", "fulano@example.com")).toBe("F");
  });

  it("cai para a 1ª letra do email quando não há nome", () => {
    expect(initialsFor(null, "fulano@example.com")).toBe("F");
    expect(initialsFor("   ", "fulano@example.com")).toBe("F");
  });

  it("retorna '?' quando não há nome nem email", () => {
    expect(initialsFor(null, null)).toBe("?");
    expect(initialsFor("", "")).toBe("?");
  });

  it("ignora espaços extras e normaliza para maiúsculas", () => {
    expect(initialsFor("  ana   maria  ", null)).toBe("AM");
  });
});
