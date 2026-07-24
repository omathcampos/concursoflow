import { describe, expect, it } from "vitest";

import { forgotPasswordSchema, loginSchema, passwordStrength, signUpSchema } from "@/lib/domain/auth-validation";

describe("signUpSchema", () => {
  it("aceita nome, email e senha válidos", () => {
    const result = signUpSchema.safeParse({ name: "Fulano", email: "fulano@example.com", password: "senhaForte123" });
    expect(result.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const result = signUpSchema.safeParse({ name: "  ", email: "fulano@example.com", password: "senhaForte123" });
    expect(result.success).toBe(false);
  });

  it("rejeita email inválido", () => {
    const result = signUpSchema.safeParse({ name: "Fulano", email: "não-é-email", password: "senhaForte123" });
    expect(result.success).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = signUpSchema.safeParse({ name: "Fulano", email: "fulano@example.com", password: "curta1" });
    expect(result.success).toBe(false);
  });

  it("aceita senha com exatamente 8 caracteres", () => {
    const result = signUpSchema.safeParse({ name: "Fulano", email: "fulano@example.com", password: "12345678" });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("aceita email e senha preenchidos", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "qualquer" }).success).toBe(true);
  });

  it("rejeita email inválido ou senha vazia", () => {
    expect(loginSchema.safeParse({ email: "invalido", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("aceita email válido e rejeita inválido", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "invalido" }).success).toBe(false);
  });
});

describe("passwordStrength", () => {
  it("classifica senhas curtas como fraca", () => {
    expect(passwordStrength("1234567")).toBe("fraca");
    expect(passwordStrength("simples1")).not.toBe("forte");
  });

  it("classifica senha só com minúsculas e 8+ chars como média", () => {
    expect(passwordStrength("abcdefgh")).toBe("média");
  });

  it("classifica senha longa com maiúsculas, números e símbolos como forte", () => {
    expect(passwordStrength("SenhaForte#2026!")).toBe("forte");
  });
});
