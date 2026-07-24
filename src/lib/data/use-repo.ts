import { useMemo } from "react";

import { getDataSource } from "@/lib/data/data-source";
import { createLocalRepository } from "@/lib/data/local/local-repository";
import { useLocalStore } from "@/lib/data/local/store";
import { createSupabaseRepository } from "@/lib/data/supabase/repository";
import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";
import { SEED_SUBJECTS } from "@/lib/domain/seed-data";
import type { Repository } from "@/lib/data/repository";
import type { TimerState } from "@/lib/domain/timer";

/**
 * Único ponto de acesso da UI aos dados: local (Zustand/localStorage) ou
 * Supabase, conforme NEXT_PUBLIC_DATA_SOURCE — sem mudar a assinatura nem
 * os componentes que a usam (Repository Pattern). Chama ambos os hooks
 * incondicionalmente (regra dos hooks); a fonte de dados não muda em
 * runtime, só escolhemos qual repositório construir.
 */
export function useRepo(): Repository {
  const localState = useLocalStore((s) => s);
  const cacheState = useSupabaseCache((s) => s);
  const dataSource = getDataSource();

  // useMemo com cacheState/localState nas deps: dependência explícita para o
  // React Compiler não memoizar `repo` (e, por tabela, `repo.x.list()`) além
  // da conta — sem isso, componentes paravam de re-renderizar após a
  // primeira mutação em sequência (ver histórico do projeto sobre falsos
  // positivos do compiler com objetos retornados por hooks customizados).
  return useMemo(() => {
    if (dataSource === "local") return createLocalRepository(localState);
    return createSupabaseRepository(getSupabaseBrowserClient(), cacheState.userId ?? "");
  }, [dataSource, localState, cacheState]);
}

export function useIsSeeded(): boolean {
  const localSeeded = useLocalStore((s) => s.subjects.length > 0);
  const supabaseSeeded = useSupabaseCache((s) => s.subjects.length > 0);
  return getDataSource() === "local" ? localSeeded : supabaseSeeded;
}

export function useLoadSeed(): () => void | Promise<void> {
  const loadLocalSeed = useLocalStore((s) => s.loadSeed);
  const userId = useSupabaseCache((s) => s.userId);

  if (getDataSource() === "local") return loadLocalSeed;

  return async () => {
    const repo = createSupabaseRepository(getSupabaseBrowserClient(), userId ?? "");
    const createdSubjects = await Promise.all(
      SEED_SUBJECTS.map(async ({ name, color, weight, topics }) => {
        const subject = await repo.subjects.create({ name, color, weight, notes: null });
        await Promise.all(
          topics.map((topicName, position) => repo.topics.create({ subjectId: subject.id, name: topicName, status: "not_started", position, notes: null })),
        );
        return subject;
      }),
    );
    await repo.cycle.setup(
      "Meu ciclo",
      createdSubjects.map((subject) => ({ subjectId: subject.id, targetMinutes: 300 })),
    );
  };
}

export interface TimerControls {
  timer: TimerState;
  start: (subjectId: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => { durationMin: number; startedAt: string | null; subjectId: string | null };
}

export function useTimer(): TimerControls {
  const timer = useLocalStore((s) => s.timer);
  const start = useLocalStore((s) => s.startTimerFor);
  const pause = useLocalStore((s) => s.pauseTimerNow);
  const resume = useLocalStore((s) => s.resumeTimerNow);
  const stop = useLocalStore((s) => s.stopTimerNow);
  return { timer, start, pause, resume, stop };
}
