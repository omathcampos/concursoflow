import { createLocalRepository } from "@/lib/data/local/local-repository";
import { useLocalStore } from "@/lib/data/local/store";
import type { Repository } from "@/lib/data/repository";

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
