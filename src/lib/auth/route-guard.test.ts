import { describe, expect, it } from "vitest";

import { resolveAuthRedirect } from "@/lib/auth/route-guard";

describe("resolveAuthRedirect", () => {
  it("sem sessão em rota protegida -> redireciona para /login", () => {
    expect(resolveAuthRedirect("/", false)).toBe("/login");
    expect(resolveAuthRedirect("/calendario", false)).toBe("/login");
    expect(resolveAuthRedirect("/materias", false)).toBe("/login");
  });

  it("sem sessão em rota pública de auth -> não redireciona", () => {
    expect(resolveAuthRedirect("/login", false)).toBeNull();
    expect(resolveAuthRedirect("/cadastro", false)).toBeNull();
    expect(resolveAuthRedirect("/recuperar-senha", false)).toBeNull();
    expect(resolveAuthRedirect("/recuperar-senha/callback", false)).toBeNull();
  });

  it("com sessão em rota protegida -> não redireciona", () => {
    expect(resolveAuthRedirect("/", true)).toBeNull();
    expect(resolveAuthRedirect("/dashboard", true)).toBeNull();
  });

  it("com sessão em /login ou /cadastro -> redireciona para /", () => {
    expect(resolveAuthRedirect("/login", true)).toBe("/");
    expect(resolveAuthRedirect("/cadastro", true)).toBe("/");
  });

  it("com sessão em /recuperar-senha -> não redireciona (fluxo de troca de senha usa sessão de recovery)", () => {
    expect(resolveAuthRedirect("/recuperar-senha", true)).toBeNull();
    expect(resolveAuthRedirect("/recuperar-senha/callback", true)).toBeNull();
  });
});
