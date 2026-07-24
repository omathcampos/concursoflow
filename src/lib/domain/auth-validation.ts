import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email inválido"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export type PasswordStrength = "fraca" | "média" | "forte";

/** Indicador simples de força — length mínimo (8) já tira de "fraca"; variedade de caracteres leva a "forte". */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "fraca";

  let score = 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  return score >= 3 ? "forte" : "média";
}
