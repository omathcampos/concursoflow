// Modelos de domínio do ConcursoFlow.
// Espelham o schema Supabase em docs/03-schema.sql (versão TS, ids string/uuid).

export type TopicStatus = "not_started" | "studying" | "done";

export type BlockType = "teoria" | "questoes" | "revisao" | "lei_seca" | "aula";

export type BlockStatus = "planned" | "done" | "skipped";

export type ReviewStatus = "pending" | "done" | "skipped";

export type ReviewStep = 1 | 2 | 3;

export interface Subject {
  id: string;
  name: string;
  color: string;
  weight: number; // 1-5
  notes: string | null;
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  status: TopicStatus;
  position: number;
  notes: string | null;
  createdAt: string;
}

export interface Cycle {
  id: string;
  name: string;
  isActive: boolean;
  round: number;
  createdAt: string;
}

export interface CycleEntry {
  id: string;
  cycleId: string;
  subjectId: string;
  targetMinutes: number;
  doneMinutes: number; // derivado das sessões da rodada atual
}

export interface Block {
  id: string;
  subjectId: string;
  topicId: string | null;
  type: BlockType;
  status: BlockStatus;
  startAt: string;
  endAt: string;
  recurrenceRule: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  subjectId: string;
  topicId: string | null;
  blockId: string | null;
  cycleId: string | null;
  cycleRound: number | null;
  type: BlockType;
  startedAt: string;
  durationMin: number;
  questionsTotal: number | null;
  questionsCorrect: number | null;
  pagesRead: number | null;
  notes: string | null;
  scheduleReview: boolean; // intenção de agendar revisões espaçadas (lógica na Fase 5)
  createdAt: string;
}

export interface Review {
  id: string;
  sessionId: string | null;
  subjectId: string;
  topicId: string | null;
  step: ReviewStep; // 1=24h, 2=7d, 3=30d
  dueDate: string;
  status: ReviewStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface Annotation {
  id: string;
  subjectId: string | null;
  topicId: string | null;
  title: string;
  content: string; // markdown
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  displayName: string | null;
  targetExam: string | null;
  examDate: string | null;
  createdAt: string;
}
