import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Client admin (service_role) — ignora RLS, só usado dentro das Edge Functions. */
export function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceRoleKey);
}

/** Valida o JWT de um usuário logado (fluxo de teste manual, não o cron). */
export async function getUserFromAuthHeader(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export function isCronAuthorized(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET");
  return Boolean(secret) && req.headers.get("x-cron-secret") === secret;
}
