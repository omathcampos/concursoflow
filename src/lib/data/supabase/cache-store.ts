import { create } from "zustand";

import type { Annotation, Block, CalendarFeed, Cycle, CycleEntry, NotificationPrefs, Profile, Review, Session, Subject, Topic } from "@/lib/data/types";

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
  notificationPrefs: NotificationPrefs | undefined;
  calendarFeed: CalendarFeed | undefined;
}

interface SupabaseCacheStore extends SupabaseCacheData {
  /** id do usuário autenticado (auth.getUser()) — null antes do login/hidratação. */
  userId: string | null;
  /** email do usuário autenticado — vem de auth.getUser()/onAuthStateChange, não da tabela profiles. */
  userEmail: string | null;
  status: CacheStatus;
  error: string | null;
  setUserId: (userId: string | null) => void;
  setUserEmail: (email: string | null) => void;
  setSnapshot: (data: SupabaseCacheData) => void;
  setStatus: (status: CacheStatus) => void;
  setError: (message: string) => void;
}

function emptyProfile(userId = ""): Profile {
  return { id: userId, displayName: null, targetExam: null, examDate: null, createdAt: new Date().toISOString() };
}

/**
 * Cache reativo (Zustand) hidratado a partir do Supabase. list()/get() do
 * SupabaseRepository leem daqui de forma síncrona; mutações fazem I/O real
 * e então atualizam este cache (nunca fica stale). Ver CLAUDE.md.
 */
export const useSupabaseCache = create<SupabaseCacheStore>((set) => ({
  userId: null,
  userEmail: null,
  subjects: [],
  topics: [],
  cycles: [],
  cycleEntries: [],
  blocks: [],
  sessions: [],
  reviews: [],
  annotations: [],
  profile: emptyProfile(),
  notificationPrefs: undefined,
  calendarFeed: undefined,
  status: "idle",
  error: null,
  setUserId: (userId) => set({ userId, profile: emptyProfile(userId ?? "") }),
  setUserEmail: (userEmail) => set({ userEmail }),
  setSnapshot: (data) => set({ ...data, status: "ready", error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
}));
