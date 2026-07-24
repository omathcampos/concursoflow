import { createLocalRepository } from "@/lib/data/local/local-repository";
import { useLocalStore } from "@/lib/data/local/store";
import type { Repository } from "@/lib/data/repository";
import type { TimerState } from "@/lib/domain/timer";

/**
 * Único ponto de acesso da UI aos dados. Hoje aponta para o LocalRepository
 * (Zustand + persist); a fase 7 troca a implementação por Supabase sem
 * mudar esta assinatura nem os componentes que a usam.
 */
export function useRepo(): Repository {
  const state = useLocalStore((s) => s);
  return createLocalRepository(state);
}

export function useIsSeeded(): boolean {
  return useLocalStore((s) => s.subjects.length > 0);
}

export function useLoadSeed(): () => void {
  return useLocalStore((s) => s.loadSeed);
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
