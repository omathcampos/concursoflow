import { create } from "zustand";

import type { Annotation, Block, Cycle, CycleEntry, Profile, Review, Session, Subject, Topic } from "@/lib/data/types";

export type CacheStatus = "idle" | "loading" | "ready" | "error";

export interface SupabaseCacheData {
  subjects: Subject[];
  topics: Topic[];
  cycles: Cycle[];
  cycleEntries: Array<Omit<CycleEntry, "doneMinutes">>;
  blocks: Block[];
  sessions: Session[];
  reviews: Review[];
  annotations: Annotation[];
  profile: Profile;
}

interface SupabaseCacheStore extends SupabaseCacheData {
  status: CacheStatus;
  error: string | null;
  setSnapshot: (data: SupabaseCacheData) => void;
  setStatus: (status: CacheStatus) => void;
  setError: (message: string) => void;
}

function emptyProfile(): Profile {
  const userId = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";
  return { id: userId, displayName: null, targetExam: null, examDate: null, createdAt: new Date().toISOString() };
}

/**
 * Cache reativo (Zustand) hidratado a partir do Supabase. list()/get() do
 * SupabaseRepository leem daqui de forma síncrona; mutações fazem I/O real
 * e então atualizam este cache (nunca fica stale). Ver CLAUDE.md.
 */
export const useSupabaseCache = create<SupabaseCacheStore>((set) => ({
  subjects: [],
  topics: [],
  cycles: [],
  cycleEntries: [],
  blocks: [],
  sessions: [],
  reviews: [],
  annotations: [],
  profile: emptyProfile(),
  status: "idle",
  error: null,
  setSnapshot: (data) => set({ ...data, status: "ready", error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
}));
