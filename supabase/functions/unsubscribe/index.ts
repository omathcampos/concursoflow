// Pública (verify_jwt: false) — acessada sem login a partir do link no
// rodapé dos emails. Desliga só o tipo de notificação pedido, identificando
// o usuário pelo unsubscribe_token (não pelo JWT).
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/db.ts";

const ENABLED_COLUMN: Record<string, string> = {
  daily: "daily_enabled",
  weekly: "weekly_enabled",
  overdue: "overdue_enabled",
};

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");
  const column = type ? ENABLED_COLUMN[type] : undefined;

  if (!token || !column) {
    return corsJson({ ok: false, error: "Link inválido." }, 400);
  }

  const admin = getAdminClient();
  const { data, error } = await admin.from("notification_prefs").update({ [column]: false }).eq("unsubscribe_token", token).select().maybeSingle();

  // 22P02 = "invalid input syntax for type uuid" — token mal formado, mesmo tratamento que token inexistente.
  if (error && error.code !== "22P02") {
    return corsJson({ ok: false, error: "Não foi possível processar o pedido." }, 500);
  }
  if (!data) {
    return corsJson({ ok: false, error: "Link inválido ou já expirado." }, 404);
  }

  return corsJson({ ok: true, type });
});
