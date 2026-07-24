/** Iniciais para o avatar: nome de exibição (1-2 letras) ou 1ª letra do email como fallback. */
export function initialsFor(name: string | null, email: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/);
    return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  const trimmedEmail = email?.trim();
  if (trimmedEmail) return trimmedEmail[0]!.toUpperCase();
  return "?";
}
