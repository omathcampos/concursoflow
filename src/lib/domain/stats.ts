import { differenceInCalendarDays, endOfWeek, format, isSameDay, isSameWeek, parseISO, startOfDay, startOfWeek, subDays, subWeeks } from "date-fns";

import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import type { BlockType, Review, Session, Subject } from "@/lib/data/types";

const WEEK_OPTS = { weekStartsOn: 1 as const };

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type PeriodKey = "7d" | "30d" | "90d" | "all";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
];

const PERIOD_DAYS: Record<Exclude<PeriodKey, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function filterSessionsByPeriod(sessions: Session[], period: PeriodKey, from: Date = new Date()): Session[] {
  if (period === "all") return sessions;
  const start = startOfDay(subDays(from, PERIOD_DAYS[period] - 1));
  return sessions.filter((session) => new Date(session.startedAt) >= start);
}

export function minutesToday(sessions: Session[], now: Date = new Date()): number {
  return sessions
    .filter((session) => isSameDay(new Date(session.startedAt), now))
    .reduce((sum, session) => sum + session.durationMin, 0);
}

export function minutesThisWeek(sessions: Session[], now: Date = new Date()): number {
  return sessions
    .filter((session) => isSameWeek(new Date(session.startedAt), now, WEEK_OPTS))
    .reduce((sum, session) => sum + session.durationMin, 0);
}

/** Variação percentual de horas desta semana vs. semana anterior; null quando não há base de comparação. */
export function weekOverWeekDelta(sessions: Session[], now: Date = new Date()): number | null {
  const previousWeekAnchor = subWeeks(now, 1);
  const current = minutesThisWeek(sessions, now);
  const previous = minutesThisWeek(sessions, previousWeekAnchor);

  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** % de acerto geral (ponderado por questão) nos últimos 30 dias; null sem dados de questões. */
export function accuracyLast30Days(sessions: Session[], now: Date = new Date()): number | null {
  const start = startOfDay(subDays(now, 29));
  const relevant = sessions.filter(
    (session) => new Date(session.startedAt) >= start && session.questionsTotal != null && session.questionsTotal > 0,
  );
  const total = relevant.reduce((sum, session) => sum + (session.questionsTotal ?? 0), 0);
  const correct = relevant.reduce((sum, session) => sum + (session.questionsCorrect ?? 0), 0);
  if (total === 0) return null;
  return Math.round((correct / total) * 100);
}

/** Dias consecutivos com ao menos uma sessão. Hoje sem sessão ainda não quebra o streak. */
export function computeStreak(sessions: Session[], today: Date = new Date()): number {
  const daysWithSession = new Set(sessions.map((session) => format(new Date(session.startedAt), "yyyy-MM-dd")));

  let cursor = today;
  if (!daysWithSession.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = subDays(cursor, 1);
  }

  let streak = 0;
  while (daysWithSession.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export interface SubjectHoursEntry {
  subjectId: string;
  name: string;
  color: string;
  hours: number;
}

export function hoursBySubject(sessions: Session[], subjects: Subject[], period: PeriodKey, now: Date = new Date()): SubjectHoursEntry[] {
  const filtered = filterSessionsByPeriod(sessions, period, now);
  const minutesBySubject = new Map<string, number>();
  for (const session of filtered) {
    minutesBySubject.set(session.subjectId, (minutesBySubject.get(session.subjectId) ?? 0) + session.durationMin);
  }

  return subjects
    .map((subject) => ({
      subjectId: subject.id,
      name: subject.name,
      color: subject.color,
      hours: round1((minutesBySubject.get(subject.id) ?? 0) / 60),
    }))
    .filter((entry) => entry.hours > 0)
    .sort((a, b) => b.hours - a.hours);
}

export type DayHoursEntry = { date: string; label: string } & Record<string, string | number>;

/** Horas por dia dos últimos 14 dias, uma chave por matéria (id) para empilhar no gráfico. */
export function hoursByDayLast14(sessions: Session[], subjects: Subject[], now: Date = new Date()): DayHoursEntry[] {
  const days = Array.from({ length: 14 }, (_, i) => subDays(now, 13 - i));

  return days.map((day) => {
    const entry: DayHoursEntry = { date: format(day, "yyyy-MM-dd"), label: format(day, "dd/MM") };
    for (const subject of subjects) entry[subject.id] = 0;

    for (const session of sessions) {
      if (!isSameDay(new Date(session.startedAt), day)) continue;
      const current = typeof entry[session.subjectId] === "number" ? (entry[session.subjectId] as number) : 0;
      entry[session.subjectId] = round1(current + session.durationMin / 60);
    }

    return entry;
  });
}

export interface WeekEvolutionEntry {
  weekStart: string;
  label: string;
  hours: number;
  accuracy: number | null;
}

/** Evolução semanal (últimas N semanas ISO): horas totais e % de acerto (null sem dados de questões). */
export function weeklyEvolution(sessions: Session[], weeksCount = 12, now: Date = new Date()): WeekEvolutionEntry[] {
  const currentWeekStart = startOfWeek(now, WEEK_OPTS);
  const weekStarts = Array.from({ length: weeksCount }, (_, i) => subWeeks(currentWeekStart, weeksCount - 1 - i));

  return weekStarts.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, WEEK_OPTS);
    const inWeek = sessions.filter((session) => {
      const startedAt = new Date(session.startedAt);
      return startedAt >= weekStart && startedAt <= weekEnd;
    });

    const minutes = inWeek.reduce((sum, session) => sum + session.durationMin, 0);
    const withQuestions = inWeek.filter((session) => session.questionsTotal != null && session.questionsTotal > 0);
    const total = withQuestions.reduce((sum, session) => sum + (session.questionsTotal ?? 0), 0);
    const correct = withQuestions.reduce((sum, session) => sum + (session.questionsCorrect ?? 0), 0);

    return {
      weekStart: format(weekStart, "yyyy-MM-dd"),
      label: format(weekStart, "dd/MM"),
      hours: round1(minutes / 60),
      accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
    };
  });
}

export interface TypeDistributionEntry {
  type: BlockType;
  label: string;
  minutes: number;
  percent: number;
}

export function studyTypeDistribution(sessions: Session[]): TypeDistributionEntry[] {
  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMin, 0);
  if (totalMinutes === 0) return [];

  const minutesByType = new Map<BlockType, number>();
  for (const session of sessions) {
    minutesByType.set(session.type, (minutesByType.get(session.type) ?? 0) + session.durationMin);
  }

  return Array.from(minutesByType.entries())
    .map(([type, minutes]) => ({
      type,
      label: BLOCK_TYPE_LABELS[type],
      minutes,
      percent: Math.round((minutes / totalMinutes) * 100),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

export type PerformanceBucket = "green" | "amber" | "red";

export interface SubjectPerformanceEntry {
  subjectId: string;
  name: string;
  color: string;
  total: number;
  correct: number;
  percent: number;
  bucket: PerformanceBucket;
}

function bucketForPercent(percent: number): PerformanceBucket {
  if (percent >= 80) return "green";
  if (percent >= 60) return "amber";
  return "red";
}

export function questionsPerformanceBySubject(sessions: Session[], subjects: Subject[]): SubjectPerformanceEntry[] {
  const bySubject = new Map<string, { total: number; correct: number }>();
  for (const session of sessions) {
    if (session.questionsTotal == null || session.questionsTotal <= 0) continue;
    const acc = bySubject.get(session.subjectId) ?? { total: 0, correct: 0 };
    acc.total += session.questionsTotal;
    acc.correct += session.questionsCorrect ?? 0;
    bySubject.set(session.subjectId, acc);
  }

  return subjects
    .filter((subject) => bySubject.has(subject.id))
    .map((subject) => {
      const { total, correct } = bySubject.get(subject.id)!;
      const percent = Math.round((correct / total) * 100);
      return { subjectId: subject.id, name: subject.name, color: subject.color, total, correct, percent, bucket: bucketForPercent(percent) };
    })
    .sort((a, b) => b.percent - a.percent);
}

export interface OverdueSubjectEntry {
  subjectId: string;
  name: string;
  color: string;
  count: number;
  maxDaysLate: number;
}

/** Top N matérias com revisões pendentes vencidas (dueDate < hoje), ordenadas pelo maior atraso. */
export function topOverdueSubjects(reviews: Review[], subjects: Subject[], now: Date = new Date(), limit = 3): OverdueSubjectEntry[] {
  const today = format(now, "yyyy-MM-dd");
  const bySubject = new Map<string, { count: number; maxDaysLate: number }>();

  for (const review of reviews) {
    if (review.status !== "pending" || review.dueDate >= today) continue;
    const daysLate = differenceInCalendarDays(now, parseISO(review.dueDate));
    const acc = bySubject.get(review.subjectId) ?? { count: 0, maxDaysLate: 0 };
    acc.count += 1;
    acc.maxDaysLate = Math.max(acc.maxDaysLate, daysLate);
    bySubject.set(review.subjectId, acc);
  }

  return subjects
    .filter((subject) => bySubject.has(subject.id))
    .map((subject) => ({ subjectId: subject.id, name: subject.name, color: subject.color, ...bySubject.get(subject.id)! }))
    .sort((a, b) => b.maxDaysLate - a.maxDaysLate || b.count - a.count)
    .slice(0, limit);
}
