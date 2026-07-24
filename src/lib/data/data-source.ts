export type DataSource = "local" | "supabase";

/**
 * `local` | `supabase` via NEXT_PUBLIC_DATA_SOURCE. Default `supabase`, mas
 * cai para `local` se as credenciais do Supabase não estiverem configuradas
 * (ex.: CI, ou clone sem .env.local) — nunca quebra o boot do app.
 */
export function getDataSource(): DataSource {
  const configured = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (configured === "local") return "local";

  const hasSupabaseCreds = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (configured === "supabase" && !hasSupabaseCreds) {
    console.warn("NEXT_PUBLIC_DATA_SOURCE=supabase mas NEXT_PUBLIC_SUPABASE_URL/ANON_KEY não configurados — usando 'local'.");
    return "local";
  }

  return hasSupabaseCreds ? "supabase" : "local";
}
