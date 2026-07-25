// CORS pras functions chamadas direto do browser (daily/weekly/overdue via
// "enviar agora" no Perfil, unsubscribe via /unsubscribe). O preflight OPTIONS
// do navegador nunca manda Authorization — se cair na lógica normal da
// function (que exige auth), volta 401 sem header de CORS e o browser
// bloqueia a requisição real antes mesmo dela sair. Por isso o OPTIONS
// precisa de resposta própria, antes de qualquer verificação de auth.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** Chamar antes de qualquer outra lógica no Deno.serve — retorna a resposta do preflight, ou null se não for OPTIONS. */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  return null;
}

/** JSON response com os headers de CORS já incluídos — usar em vez de `new Response(JSON.stringify(...))` direto. */
export function corsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
