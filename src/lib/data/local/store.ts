import { create } from "zustand";
import { persist } from "zustand/middleware";

import { generateWeeklyOccurrences } from "@/lib/domain/blocks";
import type { CycleSetupEntry, DeleteScope } from "@/lib/data/repository";
import type { Annotation, Block, Cycle, CycleEntry, Subject, Topic } from "@/lib/data/types";

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export interface LocalState {
  subjects: Subject[];
  topics: Topic[];
  annotations: Annotation[];
  cycles: Cycle[];
  cycleEntries: CycleEntry[];
  blocks: Block[];

  createSubject: (input: Omit<Subject, "id" | "createdAt">) => Subject;
  updateSubject: (id: string, patch: Partial<Omit<Subject, "id" | "createdAt">>) => Subject;
  removeSubject: (id: string) => void;

  createTopic: (input: Omit<Topic, "id" | "createdAt">) => Topic;
  updateTopic: (id: string, patch: Partial<Omit<Topic, "id" | "createdAt">>) => Topic;
  removeTopic: (id: string) => void;

  createAnnotation: (input: Omit<Annotation, "id" | "createdAt" | "updatedAt">) => Annotation;
  updateAnnotation: (id: string, patch: Partial<Omit<Annotation, "id" | "createdAt" | "updatedAt">>) => Annotation;
  removeAnnotation: (id: string) => void;

  setupCycle: (name: string, entries: CycleSetupEntry[]) => Cycle;
  addCycleProgress: (cycleId: string, subjectId: string, minutes: number) => void;
  startNewRound: (cycleId: string) => Cycle;

  createBlock: (input: Omit<Block, "id" | "createdAt">) => Block;
  updateBlock: (id: string, patch: Partial<Omit<Block, "id" | "createdAt">>) => Block;
  removeBlock: (id: string) => void;
  createBlockSeries: (input: Omit<Block, "id" | "createdAt" | "recurrenceRule">, weeksCount: number) => Block[];
  removeBlockSeries: (id: string, scope: DeleteScope) => void;

  loadSeed: () => void;
}

export const useLocalStore = create<LocalState>()(
  persist(
    (set, get) => ({
      subjects: [],
      topics: [],
      annotations: [],
      cycles: [],
      cycleEntries: [],
      blocks: [],

      createSubject: (input) => {
        const subject: Subject = { id: uid(), createdAt: now(), ...input };
        set((state) => ({ subjects: [...state.subjects, subject] }));
        return subject;
      },
      updateSubject: (id, patch) => {
        let updated: Subject | undefined;
        set((state) => ({
          subjects: state.subjects.map((subject) => {
            if (subject.id !== id) return subject;
            updated = { ...subject, ...patch };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Subject ${id} não encontrada`);
        return updated;
      },
      removeSubject: (id) => {
        set((state) => ({
          subjects: state.subjects.filter((subject) => subject.id !== id),
          topics: state.topics.filter((topic) => topic.subjectId !== id),
          cycleEntries: state.cycleEntries.filter((entry) => entry.subjectId !== id),
          blocks: state.blocks.filter((block) => block.subjectId !== id),
          annotations: state.annotations.map((annotation) =>
            annotation.subjectId === id ? { ...annotation, subjectId: null } : annotation,
          ),
        }));
      },

      createTopic: (input) => {
        const topic: Topic = { id: uid(), createdAt: now(), ...input };
        set((state) => ({ topics: [...state.topics, topic] }));
        return topic;
      },
      updateTopic: (id, patch) => {
        let updated: Topic | undefined;
        set((state) => ({
          topics: state.topics.map((topic) => {
            if (topic.id !== id) return topic;
            updated = { ...topic, ...patch };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Topic ${id} não encontrado`);
        return updated;
      },
      removeTopic: (id) => {
        set((state) => ({
          topics: state.topics.filter((topic) => topic.id !== id),
          annotations: state.annotations.map((annotation) =>
            annotation.topicId === id ? { ...annotation, topicId: null } : annotation,
          ),
        }));
      },

      createAnnotation: (input) => {
        const timestamp = now();
        const annotation: Annotation = { id: uid(), createdAt: timestamp, updatedAt: timestamp, ...input };
        set((state) => ({ annotations: [...state.annotations, annotation] }));
        return annotation;
      },
      updateAnnotation: (id, patch) => {
        let updated: Annotation | undefined;
        set((state) => ({
          annotations: state.annotations.map((annotation) => {
            if (annotation.id !== id) return annotation;
            updated = { ...annotation, ...patch, updatedAt: now() };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Annotation ${id} não encontrada`);
        return updated;
      },
      removeAnnotation: (id) => {
        set((state) => ({ annotations: state.annotations.filter((annotation) => annotation.id !== id) }));
      },

      setupCycle: (name, entries) => {
        const existing = get().cycles.find((cycle) => cycle.isActive);
        const cycle: Cycle = existing ?? { id: uid(), name, isActive: true, round: 1, createdAt: now() };

        if (!existing) {
          set((state) => ({ cycles: [...state.cycles, cycle] }));
        } else if (existing.name !== name) {
          set((state) => ({
            cycles: state.cycles.map((c) => (c.id === existing.id ? { ...c, name } : c)),
          }));
        }

        set((state) => {
          const currentEntries = state.cycleEntries.filter((entry) => entry.cycleId === cycle.id);
          const nextEntries: CycleEntry[] = entries.map((input) => {
            const current = currentEntries.find((entry) => entry.subjectId === input.subjectId);
            return (
              current
                ? { ...current, targetMinutes: input.targetMinutes }
                : { id: uid(), cycleId: cycle.id, subjectId: input.subjectId, targetMinutes: input.targetMinutes, doneMinutes: 0 }
            );
          });
          return {
            cycleEntries: [...state.cycleEntries.filter((entry) => entry.cycleId !== cycle.id), ...nextEntries],
          };
        });

        return cycle;
      },
      addCycleProgress: (cycleId, subjectId, minutes) => {
        set((state) => ({
          cycleEntries: state.cycleEntries.map((entry) =>
            entry.cycleId === cycleId && entry.subjectId === subjectId
              ? { ...entry, doneMinutes: entry.doneMinutes + minutes }
              : entry,
          ),
        }));
      },
      startNewRound: (cycleId) => {
        let updated: Cycle | undefined;
        set((state) => ({
          cycles: state.cycles.map((cycle) => {
            if (cycle.id !== cycleId) return cycle;
            updated = { ...cycle, round: cycle.round + 1 };
            return updated;
          }),
          cycleEntries: state.cycleEntries.map((entry) =>
            entry.cycleId === cycleId ? { ...entry, doneMinutes: 0 } : entry,
          ),
        }));
        if (!updated) throw new Error(`Cycle ${cycleId} não encontrado`);
        return updated;
      },

      createBlock: (input) => {
        const block: Block = { id: uid(), createdAt: now(), ...input };
        set((state) => ({ blocks: [...state.blocks, block] }));
        return block;
      },
      updateBlock: (id, patch) => {
        let updated: Block | undefined;
        set((state) => ({
          blocks: state.blocks.map((block) => {
            if (block.id !== id) return block;
            updated = { ...block, ...patch };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Block ${id} não encontrado`);
        return updated;
      },
      removeBlock: (id) => {
        set((state) => ({ blocks: state.blocks.filter((block) => block.id !== id) }));
      },
      createBlockSeries: (input, weeksCount) => {
        const recurrenceRule = `WEEKLY:${uid()}`;
        const occurrences = generateWeeklyOccurrences(input.startAt, input.endAt, weeksCount);
        const blocks: Block[] = occurrences.map((occurrence) => ({
          id: uid(),
          createdAt: now(),
          ...input,
          startAt: occurrence.startAt,
          endAt: occurrence.endAt,
          recurrenceRule,
        }));
        set((state) => ({ blocks: [...state.blocks, ...blocks] }));
        return blocks;
      },
      removeBlockSeries: (id, scope) => {
        const target = get().blocks.find((block) => block.id === id);
        if (!target) return;

        if (scope === "this" || !target.recurrenceRule) {
          set((state) => ({ blocks: state.blocks.filter((block) => block.id !== id) }));
          return;
        }

        const targetStart = new Date(target.startAt).getTime();
        set((state) => ({
          blocks: state.blocks.filter(
            (block) =>
              !(block.recurrenceRule === target.recurrenceRule && new Date(block.startAt).getTime() >= targetStart),
          ),
        }));
      },

      loadSeed: () => {
        const seedSubjects: Array<{ name: string; color: string; weight: number; topics: string[] }> = [
          { name: "Português", color: "#8b5cf6", weight: 4, topics: ["Crase", "Concordância verbal", "Regência nominal"] },
          { name: "Direito Constitucional", color: "#3b82f6", weight: 5, topics: ["Direitos fundamentais", "Organização do Estado"] },
          { name: "Direito Administrativo", color: "#10b981", weight: 5, topics: ["Atos administrativos", "Licitações"] },
          { name: "Raciocínio Lógico-Matemático", color: "#f59e0b", weight: 3, topics: ["Proposições", "Probabilidade"] },
          { name: "Informática", color: "#ec4899", weight: 2, topics: ["Segurança da informação", "Planilhas"] },
        ];

        const createdSubjects = seedSubjects.map(({ name, color, weight, topics }) => {
          const subject = get().createSubject({ name, color, weight, notes: null });
          topics.forEach((topicName, position) => {
            get().createTopic({ subjectId: subject.id, name: topicName, status: "not_started", position, notes: null });
          });
          return subject;
        });

        get().setupCycle(
          "Meu ciclo",
          createdSubjects.map((subject) => ({ subjectId: subject.id, targetMinutes: 300 })),
        );
      },
    }),
    { name: "concursoflow-v1" },
  ),
);
