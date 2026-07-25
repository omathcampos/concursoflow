// Ponto único de conversão snake_case (linhas do Postgres) <-> camelCase (domínio TS).
// Cada tabela tem um par toXRow/fromXRow. `user_id` é injetado aqui (nunca faz parte do domínio).

import type { Annotation, Block, Cycle, CycleEntry, NotificationPrefs, Profile, Review, Session, Subject, Topic } from "@/lib/data/types";

export interface SubjectRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  weight: number;
  notes: string | null;
  created_at: string;
}

export function toSubjectRow(input: Omit<Subject, "id" | "createdAt">, userId: string) {
  return { user_id: userId, name: input.name, color: input.color, weight: input.weight, notes: input.notes };
}

export function fromSubjectRow(row: SubjectRow): Subject {
  return { id: row.id, name: row.name, color: row.color, weight: row.weight, notes: row.notes, createdAt: row.created_at };
}

export interface TopicRow {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  status: Topic["status"];
  position: number;
  notes: string | null;
  created_at: string;
}

export function toTopicRow(input: Omit<Topic, "id" | "createdAt">, userId: string) {
  return { user_id: userId, subject_id: input.subjectId, name: input.name, status: input.status, position: input.position, notes: input.notes };
}

export function fromTopicRow(row: TopicRow): Topic {
  return {
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    status: row.status,
    position: row.position,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export interface CycleRow {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  round: number;
  created_at: string;
}

export function toCycleRow(input: Omit<Cycle, "id" | "createdAt">, userId: string) {
  return { user_id: userId, name: input.name, is_active: input.isActive, round: input.round };
}

export function fromCycleRow(row: CycleRow): Cycle {
  return { id: row.id, name: row.name, isActive: row.is_active, round: row.round, createdAt: row.created_at };
}

export interface CycleEntryRow {
  id: string;
  user_id: string;
  cycle_id: string;
  subject_id: string;
  target_minutes: number;
}

export function toCycleEntryRow(input: { cycleId: string; subjectId: string; targetMinutes: number }, userId: string) {
  return { user_id: userId, cycle_id: input.cycleId, subject_id: input.subjectId, target_minutes: input.targetMinutes };
}

/** doneMinutes não existe na tabela — é sempre derivado das sessões pelo repositório. */
export function fromCycleEntryRow(row: CycleEntryRow): Omit<CycleEntry, "doneMinutes"> {
  return { id: row.id, cycleId: row.cycle_id, subjectId: row.subject_id, targetMinutes: row.target_minutes };
}

export interface BlockRow {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  type: Block["type"];
  status: Block["status"];
  start_at: string;
  end_at: string;
  recurrence_rule: string | null;
  notes: string | null;
  created_at: string;
}

export function toBlockRow(input: Omit<Block, "id" | "createdAt">, userId: string) {
  return {
    user_id: userId,
    subject_id: input.subjectId,
    topic_id: input.topicId,
    type: input.type,
    status: input.status,
    start_at: input.startAt,
    end_at: input.endAt,
    recurrence_rule: input.recurrenceRule,
    notes: input.notes,
  };
}

export function fromBlockRow(row: BlockRow): Block {
  return {
    id: row.id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    type: row.type,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    recurrenceRule: row.recurrence_rule,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export interface SessionRow {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  block_id: string | null;
  cycle_id: string | null;
  cycle_round: number | null;
  type: Session["type"];
  started_at: string;
  duration_min: number;
  questions_total: number | null;
  questions_correct: number | null;
  pages_read: number | null;
  notes: string | null;
  schedule_review: boolean;
  created_at: string;
}

export function toSessionRow(input: Omit<Session, "id" | "createdAt">, userId: string) {
  return {
    user_id: userId,
    subject_id: input.subjectId,
    topic_id: input.topicId,
    block_id: input.blockId,
    cycle_id: input.cycleId,
    cycle_round: input.cycleRound,
    type: input.type,
    started_at: input.startedAt,
    duration_min: input.durationMin,
    questions_total: input.questionsTotal,
    questions_correct: input.questionsCorrect,
    pages_read: input.pagesRead,
    notes: input.notes,
    schedule_review: input.scheduleReview,
  };
}

export function fromSessionRow(row: SessionRow): Session {
  return {
    id: row.id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    blockId: row.block_id,
    cycleId: row.cycle_id,
    cycleRound: row.cycle_round,
    type: row.type,
    startedAt: row.started_at,
    durationMin: row.duration_min,
    questionsTotal: row.questions_total,
    questionsCorrect: row.questions_correct,
    pagesRead: row.pages_read,
    notes: row.notes,
    scheduleReview: row.schedule_review,
    createdAt: row.created_at,
  };
}

export interface ReviewRow {
  id: string;
  user_id: string;
  session_id: string | null;
  subject_id: string;
  topic_id: string | null;
  step: Review["step"];
  due_date: string;
  status: Review["status"];
  completed_at: string | null;
  created_at: string;
}

export function toReviewRow(input: Omit<Review, "id" | "createdAt">, userId: string) {
  return {
    user_id: userId,
    session_id: input.sessionId,
    subject_id: input.subjectId,
    topic_id: input.topicId,
    step: input.step,
    due_date: input.dueDate,
    status: input.status,
    completed_at: input.completedAt,
  };
}

export function fromReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    sessionId: row.session_id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    step: row.step,
    dueDate: row.due_date,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export interface AnnotationRow {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function toAnnotationRow(input: Omit<Annotation, "id" | "createdAt" | "updatedAt">, userId: string) {
  return { user_id: userId, subject_id: input.subjectId, topic_id: input.topicId, title: input.title, content: input.content };
}

export function fromAnnotationRow(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  target_exam: string | null;
  exam_date: string | null;
  created_at: string;
}

export function toProfileRow(input: Partial<Pick<Profile, "displayName" | "targetExam" | "examDate">>) {
  return { display_name: input.displayName ?? null, target_exam: input.targetExam ?? null, exam_date: input.examDate ?? null };
}

export function fromProfileRow(row: ProfileRow): Profile {
  return { id: row.id, displayName: row.display_name, targetExam: row.target_exam, examDate: row.exam_date, createdAt: row.created_at };
}

export interface NotificationPrefsRow {
  user_id: string;
  daily_enabled: boolean;
  daily_hour: number;
  weekly_enabled: boolean;
  overdue_enabled: boolean;
  channel_email: boolean;
  channel_telegram: boolean;
  telegram_chat_id: string | null;
  timezone: string;
  unsubscribe_token: string;
}

export function fromNotificationPrefsRow(row: NotificationPrefsRow): NotificationPrefs {
  return {
    userId: row.user_id,
    dailyEnabled: row.daily_enabled,
    dailyHour: row.daily_hour,
    weeklyEnabled: row.weekly_enabled,
    overdueEnabled: row.overdue_enabled,
    channelEmail: row.channel_email,
    channelTelegram: row.channel_telegram,
    telegramChatId: row.telegram_chat_id,
    timezone: row.timezone,
    unsubscribeToken: row.unsubscribe_token,
  };
}

export function toNotificationPrefsRow(
  patch: Partial<Pick<NotificationPrefs, "dailyEnabled" | "dailyHour" | "weeklyEnabled" | "overdueEnabled" | "channelEmail" | "channelTelegram">>,
) {
  const row: Record<string, unknown> = {};
  if (patch.dailyEnabled !== undefined) row.daily_enabled = patch.dailyEnabled;
  if (patch.dailyHour !== undefined) row.daily_hour = patch.dailyHour;
  if (patch.weeklyEnabled !== undefined) row.weekly_enabled = patch.weeklyEnabled;
  if (patch.overdueEnabled !== undefined) row.overdue_enabled = patch.overdueEnabled;
  if (patch.channelEmail !== undefined) row.channel_email = patch.channelEmail;
  if (patch.channelTelegram !== undefined) row.channel_telegram = patch.channelTelegram;
  return row;
}
