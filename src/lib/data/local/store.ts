import { create } from "zustand";
import { persist } from "zustand/middleware";

import { generateWeeklyOccurrences } from "@/lib/domain/blocks";
import { nextReviewStep, scheduleFirstReview } from "@/lib/domain/reviews";
import { SEED_SUBJECTS } from "@/lib/domain/seed-data";
import { IDLE_TIMER, pauseTimer, resumeTimer, startTimer, stopTimer, type TimerState } from "@/lib/domain/timer";
import type { CycleSetupEntry, DeleteScope } from "@/lib/data/repository";
import type { Annotation, Block, Cycle, CycleEntry, NotificationPrefs, Profile, Review, Session, Subject, Topic } from "@/lib/data/types";

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
  sessions: Session[];
  reviews: Review[];
  timer: TimerState;
  profile: Profile;
  notificationPrefs: NotificationPrefs;

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
  startNewRound: (cycleId: string) => Cycle;

  createBlock: (input: Omit<Block, "id" | "createdAt">) => Block;
  updateBlock: (id: string, patch: Partial<Omit<Block, "id" | "createdAt">>) => Block;
  removeBlock: (id: string) => void;
  createBlockSeries: (input: Omit<Block, "id" | "createdAt" | "recurrenceRule">, weeksCount: number) => Block[];
  removeBlockSeries: (id: string, scope: DeleteScope) => void;

  createSession: (input: Omit<Session, "id" | "createdAt">) => Session;
  updateSession: (id: string, patch: Partial<Omit<Session, "id" | "createdAt">>) => Session;
  removeSession: (id: string) => void;

  createReview: (input: Omit<Review, "id" | "createdAt">) => Review;
  updateReview: (id: string, patch: Partial<Omit<Review, "id" | "createdAt">>) => Review;
  removeReview: (id: string) => void;
  completeReview: (id: string) => void;
  skipReview: (id: string) => void;

  updateProfile: (patch: Partial<Pick<Profile, "displayName" | "targetExam" | "examDate">>) => Profile;

  updateNotificationPrefs: (
    patch: Partial<Pick<NotificationPrefs, "dailyEnabled" | "dailyHour" | "weeklyEnabled" | "overdueEnabled" | "channelEmail" | "timezone">>,
  ) => NotificationPrefs;

  startTimerFor: (subjectId: string) => void;
  pauseTimerNow: () => void;
  resumeTimerNow: () => void;
  stopTimerNow: () => { durationMin: number; startedAt: string | null; subjectId: string | null };

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
      sessions: [],
      reviews: [],
      timer: IDLE_TIMER,
      profile: { id: "local", displayName: null, targetExam: null, examDate: null, createdAt: now() },
      notificationPrefs: {
        userId: "local",
        dailyEnabled: true,
        dailyHour: 7,
        weeklyEnabled: true,
        overdueEnabled: true,
        channelEmail: true,
        channelTelegram: false,
        telegramChatId: null,
        timezone: "America/Sao_Paulo",
        unsubscribeToken: "local",
      },

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
          sessions: state.sessions.filter((session) => session.subjectId !== id),
          reviews: state.reviews.filter((review) => review.subjectId !== id),
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
          sessions: state.sessions.map((session) =>
            session.topicId === id ? { ...session, topicId: null } : session,
          ),
          reviews: state.reviews.map((review) =>
            review.topicId === id ? { ...review, topicId: null } : review,
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
      startNewRound: (cycleId) => {
        let updated: Cycle | undefined;
        set((state) => ({
          cycles: state.cycles.map((cycle) => {
            if (cycle.id !== cycleId) return cycle;
            updated = { ...cycle, round: cycle.round + 1 };
            return updated;
          }),
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
        set((state) => ({
          blocks: state.blocks.filter((block) => block.id !== id),
          sessions: state.sessions.map((session) =>
            session.blockId === id ? { ...session, blockId: null } : session,
          ),
        }));
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

        const idsToRemove =
          scope === "this" || !target.recurrenceRule
            ? [id]
            : get()
                .blocks.filter(
                  (block) =>
                    block.recurrenceRule === target.recurrenceRule &&
                    new Date(block.startAt).getTime() >= new Date(target.startAt).getTime(),
                )
                .map((block) => block.id);

        set((state) => ({
          blocks: state.blocks.filter((block) => !idsToRemove.includes(block.id)),
          sessions: state.sessions.map((session) =>
            session.blockId && idsToRemove.includes(session.blockId) ? { ...session, blockId: null } : session,
          ),
        }));
      },

      createSession: (input) => {
        const session: Session = { id: uid(), createdAt: now(), ...input };
        set((state) => ({ sessions: [...state.sessions, session] }));
        if (session.scheduleReview) {
          const review = scheduleFirstReview({
            sessionId: session.id,
            subjectId: session.subjectId,
            topicId: session.topicId,
          });
          get().createReview(review);
        }
        return session;
      },
      updateSession: (id, patch) => {
        let updated: Session | undefined;
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== id) return session;
            updated = { ...session, ...patch };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Session ${id} não encontrada`);
        return updated;
      },
      removeSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== id),
          reviews: state.reviews.filter((review) => review.sessionId !== id),
        }));
      },

      createReview: (input) => {
        const review: Review = { id: uid(), createdAt: now(), ...input };
        set((state) => ({ reviews: [...state.reviews, review] }));
        return review;
      },
      updateReview: (id, patch) => {
        let updated: Review | undefined;
        set((state) => ({
          reviews: state.reviews.map((review) => {
            if (review.id !== id) return review;
            updated = { ...review, ...patch };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Review ${id} não encontrada`);
        return updated;
      },
      removeReview: (id) => {
        set((state) => ({ reviews: state.reviews.filter((review) => review.id !== id) }));
      },
      completeReview: (id) => {
        const review = get().reviews.find((r) => r.id === id);
        if (!review) throw new Error(`Review ${id} não encontrada`);
        get().updateReview(id, { status: "done", completedAt: now() });
        const next = nextReviewStep(review);
        if (next) get().createReview(next);
      },
      skipReview: (id) => {
        get().updateReview(id, { status: "skipped" });
      },

      updateProfile: (patch) => {
        let updated: Profile | undefined;
        set((state) => {
          updated = { ...state.profile, ...patch };
          return { profile: updated };
        });
        return updated!;
      },

      updateNotificationPrefs: (patch) => {
        let updated: NotificationPrefs | undefined;
        set((state) => {
          updated = { ...state.notificationPrefs, ...patch };
          return { notificationPrefs: updated };
        });
        return updated!;
      },

      startTimerFor: (subjectId) => set({ timer: startTimer(subjectId) }),
      pauseTimerNow: () => set((state) => ({ timer: pauseTimer(state.timer) })),
      resumeTimerNow: () => set((state) => ({ timer: resumeTimer(state.timer) })),
      stopTimerNow: () => {
        const timer = get().timer;
        const { durationMin, startedAt } = stopTimer(timer);
        const subjectId = timer.subjectId;
        set({ timer: IDLE_TIMER });
        return { durationMin, startedAt, subjectId };
      },

      loadSeed: () => {
        const createdSubjects = SEED_SUBJECTS.map(({ name, color, weight, topics }) => {
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
