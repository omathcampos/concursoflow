"use client";

import { AlertTriangle, GraduationCap, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getDataSource } from "@/lib/data/data-source";
import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";
import { hydrateSupabaseCache, type HydrateOptions } from "@/lib/data/supabase/hydrate";

/** Alt-tab rápido não deve disparar rede de novo — só revalida por foco se já fazem 30s+ da última tentativa. */
const FOCUS_REVALIDATE_THROTTLE_MS = 30_000;

function BootScreen({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <GraduationCap className="h-6 w-6" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {message}
      </div>
    </div>
  );
}

/**
 * Faz o boot do backend Supabase quando NEXT_PUBLIC_DATA_SOURCE=supabase:
 * lê o usuário autenticado (o middleware já garante que existe uma sessão
 * antes desta rota renderizar) e hidrata o cache reativo. Bloqueia a
 * renderização do app até o cache estar pronto (evita qualquer página
 * piscar estado vazio). Refaz a hidratação quando a janela ganha foco, e
 * também ao trocar de usuário (logout/login) via onAuthStateChange. Com
 * DATA_SOURCE=local não faz nada — o Zustand local já está pronto de imediato.
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const dataSource = getDataSource();
  const status = useSupabaseCache((s) => s.status);
  const cacheError = useSupabaseCache((s) => s.error);
  const setUserId = useSupabaseCache((s) => s.setUserId);
  const setUserEmail = useSupabaseCache((s) => s.setUserEmail);
  const setStatus = useSupabaseCache((s) => s.setStatus);
  const [authError, setAuthError] = useState<string | null>(null);
  const lastFocusRevalidateAtRef = useRef(0);

  useEffect(() => {
    if (dataSource !== "supabase") return;

    let cancelled = false;
    const client = getSupabaseBrowserClient();

    async function hydrateFor(userId: string, options?: HydrateOptions) {
      try {
        await hydrateSupabaseCache(client, userId, options);
      } catch {
        // Logo após o login, alguma request pode cair num nó de borda com o
        // relógio levemente atrasado (JWT ainda "não válido" por < 1s) —
        // uma única retentativa curta resolve sem precisar recarregar a página.
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (cancelled) return;
        await hydrateSupabaseCache(client, userId, options).catch(() => {});
      }
    }

    async function boot() {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();
      if (cancelled) return;

      if (userError || !user) {
        setAuthError(userError?.message ?? "Sessão não encontrada.");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? null);
      await hydrateFor(user.id);
    }

    boot();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUserId(null);
        setUserEmail(null);
        setStatus("idle");
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        hydrateFor(session.user.id);
      }
    });

    function onFocus() {
      const userId = useSupabaseCache.getState().userId;
      if (!userId) return;

      const now = Date.now();
      if (now - lastFocusRevalidateAtRef.current < FOCUS_REVALIDATE_THROTTLE_MS) return;
      lastFocusRevalidateAtRef.current = now;

      // silent: revalida em segundo plano sem tocar em status/error — a tela
      // atual (dialogs abertos, scroll, cronômetro) permanece intacta; só
      // troca os dados quando a busca terminar. Falha (offline etc.) some
      // sem toast, mantendo o que já estava na tela.
      hydrateFor(userId, { silent: true }).catch(() => {});
    }
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  if (dataSource !== "supabase") return <>{children}</>;

  if (authError || cacheError) {
    return (
      <BootScreen
        icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        message={authError ?? cacheError ?? "Não foi possível conectar ao banco de dados."}
      />
    );
  }

  if (status !== "ready") {
    return <BootScreen icon={<Loader2 className="h-4 w-4 animate-spin" />} message="Carregando seus dados…" />;
  }

  return <>{children}</>;
}
