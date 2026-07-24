import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getDataSource } from "@/lib/data/data-source";
import { resolveAuthRedirect } from "@/lib/auth/route-guard";

/**
 * Exige sessão só quando DATA_SOURCE=supabase (backend real). Em `local`
 * (CI/e2e das fases 1-6, RNF03 "funciona offline") passa direto — não há
 * usuário para exigir, e essa é a suíte que roda sem credenciais.
 */
export async function proxy(request: NextRequest) {
  if (getDataSource() !== "supabase") return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = resolveAuthRedirect(request.nextUrl.pathname, Boolean(user));
  if (redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)"],
};
