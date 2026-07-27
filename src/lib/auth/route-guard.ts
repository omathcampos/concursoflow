/** Rotas públicas de autenticação — acessíveis sem sessão, e onde uma sessão normal redireciona para "/". */
const PUBLIC_AUTH_ROUTES = ["/login", "/cadastro"];

/**
 * /recuperar-senha fica de fora do redirect "sessão -> /": ao clicar no link
 * do email, o Supabase cria uma sessão do tipo "recovery" nessa própria
 * rota, então "ter sessão" não pode significar "manda embora".
 */
const RECOVERY_ROUTE = "/recuperar-senha";

/**
 * /unsubscribe é acessada a partir do link no rodapé dos emails — precisa
 * funcionar tanto sem sessão quanto com (usuário logado clicando no link),
 * então nunca redireciona, em nenhum dos dois sentidos. /docs (Fumadocs,
 * fase 13) é documentação pública — mesma regra, nunca redireciona.
 * /api/search é a rota de busca do Fumadocs, chamada via fetch pela própria
 * página /docs — sem essa exceção, o proxy redireciona a chamada de busca
 * (não a navegação) para /login, e a caixa de busca nunca mostra resultado.
 */
const NEUTRAL_ROUTES = ["/unsubscribe", "/docs", "/api/search"];

/** Decide o redirect (ou null) para o middleware, dado o pathname e se há sessão ativa. Função pura — testável sem Next.js/Supabase. */
export function resolveAuthRedirect(pathname: string, hasSession: boolean): string | null {
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isRecoveryRoute = pathname === RECOVERY_ROUTE || pathname.startsWith(`${RECOVERY_ROUTE}/`);
  const isNeutralRoute = NEUTRAL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isNeutralRoute) return null;
  if (!hasSession && !isPublicAuthRoute && !isRecoveryRoute) return "/login";
  if (hasSession && isPublicAuthRoute) return "/";
  return null;
}
