import type { CrudRepo, CycleRepo, Repository } from "@/lib/data/repository";
import type { LocalState } from "@/lib/data/local/store";

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
    create: actions.create,
    update: actions.update,
    remove: actions.remove,
  };
}

export function createLocalRepository(state: LocalState): Repository {
  const cycle: CycleRepo = {
    getActive: () => state.cycles.find((c) => c.isActive),
    entries: (cycleId) => state.cycleEntries.filter((entry) => entry.cycleId === cycleId),
    setup: state.setupCycle,
    addProgress: state.addCycleProgress,
    startNewRound: state.startNewRound,
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
  };
}
