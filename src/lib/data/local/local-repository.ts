import type { BlockRepo, CrudRepo, CycleRepo, ProfileRepo, Repository, ReviewRepo } from "@/lib/data/repository";
import type { LocalState } from "@/lib/data/local/store";

// As ações do Zustand store são síncronas por natureza (localStorage), mas o
// Repository exige mutações async (ver repository.ts) — aqui só embrulhamos
// o resultado síncrono numa Promise já resolvida, sem I/O real.
function makeCrudRepo<T extends { id: string }, Managed extends keyof T>(
  items: () => T[],
  actions: {
    create: (input: Omit<T, Managed>) => T;
    update: (id: string, patch: Partial<Omit<T, Managed>>) => T;
    remove: (id: string) => void;
  },
): CrudRepo<T, Managed> {
  return {
    list: () => items(),
    get: (id) => items().find((item) => item.id === id),
    create: async (input) => actions.create(input),
    update: async (id, patch) => actions.update(id, patch),
    remove: async (id) => actions.remove(id),
  };
}

export function createLocalRepository(state: LocalState): Repository {
  const cycle: CycleRepo = {
    getActive: () => state.cycles.find((c) => c.isActive),
    entries: (cycleId) => {
      const activeCycle = state.cycles.find((c) => c.id === cycleId);
      return state.cycleEntries
        .filter((entry) => entry.cycleId === cycleId)
        .map((entry) => ({
          ...entry,
          doneMinutes: state.sessions
            .filter(
              (session) =>
                session.cycleId === cycleId &&
                session.cycleRound === activeCycle?.round &&
                session.subjectId === entry.subjectId,
            )
            .reduce((sum, session) => sum + session.durationMin, 0),
        }));
    },
    setup: async (name, entries) => state.setupCycle(name, entries),
    startNewRound: async (cycleId) => state.startNewRound(cycleId),
  };

  return {
    subjects: makeCrudRepo(() => state.subjects, {
      create: state.createSubject,
      update: state.updateSubject,
      remove: state.removeSubject,
    }),
    topics: makeCrudRepo(() => state.topics, {
      create: state.createTopic,
      update: state.updateTopic,
      remove: state.removeTopic,
    }),
    annotations: makeCrudRepo(() => state.annotations, {
      create: state.createAnnotation,
      update: state.updateAnnotation,
      remove: state.removeAnnotation,
    }),
    cycle,
    blocks: {
      ...makeCrudRepo(() => state.blocks, {
        create: state.createBlock,
        update: state.updateBlock,
        remove: state.removeBlock,
      }),
      createSeries: async (input, weeksCount) => state.createBlockSeries(input, weeksCount),
      removeSeries: async (id, scope) => state.removeBlockSeries(id, scope),
    } satisfies BlockRepo,
    sessions: makeCrudRepo(() => state.sessions, {
      create: state.createSession,
      update: state.updateSession,
      remove: state.removeSession,
    }),
    reviews: {
      ...makeCrudRepo(() => state.reviews, {
        create: state.createReview,
        update: state.updateReview,
        remove: state.removeReview,
      }),
      complete: async (id) => state.completeReview(id),
      skip: async (id) => state.skipReview(id),
    } satisfies ReviewRepo,
    profile: {
      get: () => state.profile,
      update: async (patch) => state.updateProfile(patch),
    } satisfies ProfileRepo,
  };
}
