"use client";

import { AlertTriangle, GraduationCap, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getDataSource } from "@/lib/data/data-source";
import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";
import { hydrateSupabaseCache } from "@/lib/data/supabase/hydrate";

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
 * login do usuário técnico (fase 7 — fase 8 troca pelo usuário real) e
 * hidratação do cache reativo. Bloqueia a renderização do app até o cache
 * estar pronto (evita qualquer página piscar estado vazio). Refaz a
 * hidratação quando a janela ganha foco, para refletir mudanças feitas em
 * outra aba/dispositivo. Com DATA_SOURCE=local não faz nada — o Zustand
 * local já está pronto de imediato.
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const dataSource = getDataSource();
  const status = useSupabaseCache((s) => s.status);
  const cacheError = useSupabaseCache((s) => s.error);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (dataSource !== "supabase") return;

    let cancelled = false;
    const client = getSupabaseBrowserClient();
    const userId = process.env.NEXT_PUBLIC_DEV_USER_ID!;

    async function boot() {
      const { error: signInError } = await client.auth.signInWithPassword({
        email: process.env.NEXT_PUBLIC_DEV_USER_EMAIL!,
        password: process.env.NEXT_PUBLIC_DEV_USER_PASSWORD!,
      });
      if (cancelled) return;
      if (signInError) {
        setAuthError(signInError.message);
        return;
      }
      try {
        await hydrateSupabaseCache(client, userId);
      } catch {
        // Logo após o login, alguma request pode cair num nó de borda com o
        // relógio levemente atrasado (JWT ainda "não válido" por < 1s) —
        // uma única retentativa curta resolve sem precisar recarregar a página.
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (cancelled) return;
        await hydrateSupabaseCache(client, userId).catch(() => {});
      }
    }

    boot();

    function onFocus() {
      hydrateSupabaseCache(client, userId).catch(() => {});
    }
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
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
