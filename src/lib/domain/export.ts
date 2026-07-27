// Funções puras (sem I/O, sem SheetJS) que montam as tabelas da exportação de
// dados (.xlsx/.csv, Fase 14) a partir dos dados já em cache do useRepo(). A
// UI (dialog + dynamic import do SheetJS) só passa essas tabelas pro
// `XLSX.utils.aoa_to_sheet`/escreve o CSV — nenhuma lógica de negócio na UI.
import { differenceInCalendarDays, eachWeekOfInterval, endOfDay, endOfWeek, format, parseISO, startOfDay, startOfWeek, subDays } from "date-fns";

import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import { REVIEW_STEP_LABELS } from "@/lib/domain/reviews";
import type { Block, CycleEntry, Review, Session, Subject, Topic } from "@/lib/data/types";

const WEEK_OPTS = { weekStartsOn: 1 as const };

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type ExportPeriod = { kind: "30d" } | { kind: "90d" } | { kind: "all" } | { kind: "custom"; from: string; to: string };

export interface ExportRange {
  from: Date | null;
  /** null = sem limite superior — "all" inclui blocos/revisões futuros, não só até agora. */
  to: Date | null;
}

export function resolveExportRange(period: ExportPeriod, now: Date = new Date()): ExportRange {
  if (period.kind === "all") return { from: null, to: null };
  if (period.kind === "custom") return { from: startOfDay(parseISO(period.from)), to: endOfDay(parseISO(period.to)) };
  const days = period.kind === "30d" ? 30 : 90;
  return { from: startOfDay(subDays(now, days - 1)), to: endOfDay(now) };
}

function inRange(date: Date, range: ExportRange): boolean {
  if (range.from !== null && date < range.from) return false;
  if (range.to !== null && date > range.to) return false;
  return true;
}

function subjectName(subjects: Subject[], subjectId: string): string {
  return subjects.find((s) => s.id === subjectId)?.name ?? "Matéria";
}

function topicName(topics: Topic[], topicId: string | null): string | null {
  if (!topicId) return null;
  return topics.find((t) => t.id === topicId)?.name ?? null;
}

export type ExportCellType = "text" | "date" | "datetime" | "number" | "integer" | "percent";

export interface ExportColumn {
  header: string;
  type: ExportCellType;
  width?: number;
}

export type ExportCell = string | number | Date | null;

export interface ExportTable {
  columns: ExportColumn[];
  rows: ExportCell[][];
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

export interface ResumoOverviewEntry {
  label: string;
  value: string | number;
}

export interface ResumoSheet {
  overview: ResumoOverviewEntry[];
  table: ExportTable;
}

export function buildResumoSheet(input: {
  sessions: Session[];
  subjects: Subject[];
  cycleEntries: CycleEntry[];
  range: ExportRange;
  now?: Date;
}): ResumoSheet {
  const { subjects, cycleEntries, range } = input;
  const now = input.now ?? new Date();
  const sessions = input.sessions.filter((s) => inRange(new Date(s.startedAt), range));

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const withQuestions = sessions.filter((s) => s.questionsTotal != null && s.questionsTotal > 0);
  const totalQuestions = withQuestions.reduce((sum, s) => sum + (s.questionsTotal ?? 0), 0);
  const totalCorrect = withQuestions.reduce((sum, s) => sum + (s.questionsCorrect ?? 0), 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  const daysWithSession = new Set(sessions.map((s) => format(new Date(s.startedAt), "yyyy-MM-dd")));
  let cursor = now;
  if (!daysWithSession.has(format(cursor, "yyyy-MM-dd"))) cursor = subDays(cursor, 1);
  let streak = 0;
  while (daysWithSession.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  const periodLabel =
    range.from === null && range.to === null
      ? "Tudo"
      : range.from === null
        ? `Até ${format(range.to!, "dd/MM/yyyy")}`
        : range.to === null
          ? `A partir de ${format(range.from, "dd/MM/yyyy")}`
          : `${format(range.from, "dd/MM/yyyy")} a ${format(range.to, "dd/MM/yyyy")}`;

  const overview: ResumoOverviewEntry[] = [
    { label: "Período", value: periodLabel },
    { label: "Total de horas", value: round1(totalMinutes / 60) },
    { label: "Total de sessões", value: sessions.length },
    { label: "% de acerto geral", value: accuracy === null ? "-" : accuracy / 100 },
    { label: "Streak atual (dias)", value: streak },
  ];

  const minutesBySubject = new Map<string, number>();
  const countBySubject = new Map<string, number>();
  const questionsBySubject = new Map<string, { total: number; correct: number }>();
  for (const session of sessions) {
    minutesBySubject.set(session.subjectId, (minutesBySubject.get(session.subjectId) ?? 0) + session.durationMin);
    countBySubject.set(session.subjectId, (countBySubject.get(session.subjectId) ?? 0) + 1);
    if (session.questionsTotal != null && session.questionsTotal > 0) {
      const acc = questionsBySubject.get(session.subjectId) ?? { total: 0, correct: 0 };
      acc.total += session.questionsTotal;
      acc.correct += session.questionsCorrect ?? 0;
      questionsBySubject.set(session.subjectId, acc);
    }
  }

  const columns: ExportColumn[] = [
    { header: "Matéria", type: "text", width: 24 },
    { header: "Horas", type: "number", width: 10 },
    { header: "Sessões", type: "integer", width: 10 },
    { header: "Questões feitas", type: "integer", width: 14 },
    { header: "Acertos", type: "integer", width: 10 },
    { header: "% acerto", type: "percent", width: 10 },
    { header: "Horas-alvo", type: "number", width: 12 },
    { header: "% do ciclo", type: "percent", width: 12 },
  ];

  const rows: ExportCell[][] = subjects
    .filter((subject) => (minutesBySubject.get(subject.id) ?? 0) > 0)
    .map((subject) => {
      const minutes = minutesBySubject.get(subject.id) ?? 0;
      const count = countBySubject.get(subject.id) ?? 0;
      const q = questionsBySubject.get(subject.id);
      const entry = cycleEntries.find((e) => e.subjectId === subject.id);
      return [
        subject.name,
        round1(minutes / 60),
        count,
        q ? q.total : null,
        q ? q.correct : null,
        q && q.total > 0 ? round1((q.correct / q.total) * 100) / 100 : null,
        entry ? round1(entry.targetMinutes / 60) : "-",
        entry && entry.targetMinutes > 0 ? round1((entry.doneMinutes / entry.targetMinutes) * 100) / 100 : "-",
      ] satisfies ExportCell[];
    })
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  return { overview, table: { columns, rows } };
}

// ---------------------------------------------------------------------------
// Sessões
// ---------------------------------------------------------------------------

export function buildSessoesTable(sessions: Session[], subjects: Subject[], topics: Topic[], range: ExportRange): ExportTable {
  const columns: ExportColumn[] = [
    { header: "Data", type: "date", width: 12 },
    { header: "Hora", type: "text", width: 8 },
    { header: "Matéria", type: "text", width: 24 },
    { header: "Tópico", type: "text", width: 24 },
    { header: "Tipo", type: "text", width: 12 },
    { header: "Duração (min)", type: "integer", width: 14 },
    { header: "Questões feitas", type: "integer", width: 14 },
    { header: "Acertos", type: "integer", width: 10 },
    { header: "% acerto", type: "percent", width: 10 },
    { header: "Páginas", type: "integer", width: 10 },
    { header: "Comentário", type: "text", width: 32 },
  ];

  const rows: ExportCell[][] = sessions
    .filter((s) => inRange(new Date(s.startedAt), range))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((s) => {
      const startedAt = new Date(s.startedAt);
      const hasQuestions = s.questionsTotal != null && s.questionsTotal > 0;
      return [
        startedAt,
        format(startedAt, "HH:mm"),
        subjectName(subjects, s.subjectId),
        topicName(topics, s.topicId),
        BLOCK_TYPE_LABELS[s.type],
        s.durationMin,
        hasQuestions ? s.questionsTotal : null,
        hasQuestions ? (s.questionsCorrect ?? 0) : null,
        hasQuestions ? round1(((s.questionsCorrect ?? 0) / (s.questionsTotal ?? 1)) * 100) / 100 : null,
        s.pagesRead,
        s.notes,
      ] satisfies ExportCell[];
    });

  return { columns, rows };
}

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

const BLOCK_STATUS_LABELS: Record<Block["status"], string> = {
  planned: "Planejado",
  done: "Concluído",
  skipped: "Pulado",
};

export function buildBlocosTable(blocks: Block[], subjects: Subject[], topics: Topic[], range: ExportRange): ExportTable {
  const columns: ExportColumn[] = [
    { header: "Data", type: "date", width: 12 },
    { header: "Início", type: "text", width: 8 },
    { header: "Fim", type: "text", width: 8 },
    { header: "Matéria", type: "text", width: 24 },
    { header: "Tópico", type: "text", width: 24 },
    { header: "Tipo", type: "text", width: 12 },
    { header: "Status", type: "text", width: 12 },
    { header: "Recorrente", type: "text", width: 10 },
  ];

  const rows: ExportCell[][] = blocks
    .filter((b) => inRange(new Date(b.startAt), range))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .map((b) => {
      const startAt = new Date(b.startAt);
      const endAt = new Date(b.endAt);
      return [
        startAt,
        format(startAt, "HH:mm"),
        format(endAt, "HH:mm"),
        subjectName(subjects, b.subjectId),
        topicName(topics, b.topicId),
        BLOCK_TYPE_LABELS[b.type],
        BLOCK_STATUS_LABELS[b.status],
        b.recurrenceRule ? "Sim" : "Não",
      ] satisfies ExportCell[];
    });

  return { columns, rows };
}

// ---------------------------------------------------------------------------
// Revisões
// ---------------------------------------------------------------------------

const REVIEW_STATUS_LABELS: Record<Review["status"], string> = {
  pending: "Pendente",
  done: "Concluída",
  skipped: "Pulada",
};

export function buildRevisoesTable(reviews: Review[], subjects: Subject[], topics: Topic[], range: ExportRange, now: Date = new Date()): ExportTable {
  const columns: ExportColumn[] = [
    { header: "Matéria", type: "text", width: 24 },
    { header: "Tópico", type: "text", width: 24 },
    { header: "Etapa", type: "text", width: 12 },
    { header: "Data prevista", type: "date", width: 14 },
    { header: "Status", type: "text", width: 12 },
    { header: "Data de conclusão", type: "date", width: 16 },
    { header: "Dias de atraso", type: "integer", width: 12 },
  ];

  const rows: ExportCell[][] = reviews
    .filter((r) => inRange(parseISO(r.dueDate), range))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((r) => {
      const daysLate = r.status === "pending" ? Math.max(0, differenceInCalendarDays(now, parseISO(r.dueDate))) : null;
      return [
        subjectName(subjects, r.subjectId),
        topicName(topics, r.topicId),
        REVIEW_STEP_LABELS[r.step],
        parseISO(r.dueDate),
        REVIEW_STATUS_LABELS[r.status],
        r.completedAt ? new Date(r.completedAt) : null,
        daysLate,
      ] satisfies ExportCell[];
    });

  return { columns, rows };
}

// ---------------------------------------------------------------------------
// Evolução semanal
// ---------------------------------------------------------------------------

export function buildEvolucaoSemanalTable(sessions: Session[], subjects: Subject[], range: ExportRange, now: Date = new Date()): ExportTable {
  const columns: ExportColumn[] = [
    { header: "Semana", type: "date", width: 12 },
    { header: "Horas totais", type: "number", width: 12 },
    ...subjects.map((s): ExportColumn => ({ header: s.name, type: "number", width: 16 })),
    { header: "Questões", type: "integer", width: 10 },
    { header: "% acerto", type: "percent", width: 10 },
  ];

  const lowerBound = range.from ?? (sessions.length > 0 ? new Date(Math.min(...sessions.map((s) => new Date(s.startedAt).getTime()))) : null);
  if (lowerBound === null) return { columns, rows: [] };
  const upperBound = range.to ?? (sessions.length > 0 ? new Date(Math.max(...sessions.map((s) => new Date(s.startedAt).getTime()), now.getTime())) : now);

  const weekStarts = eachWeekOfInterval({ start: lowerBound, end: upperBound }, WEEK_OPTS);

  const rows: ExportCell[][] = weekStarts.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, WEEK_OPTS);
    const inWeek = sessions.filter((s) => {
      const startedAt = new Date(s.startedAt);
      return startedAt >= weekStart && startedAt <= weekEnd;
    });

    const totalMinutes = inWeek.reduce((sum, s) => sum + s.durationMin, 0);
    const minutesBySubject = new Map<string, number>();
    for (const s of inWeek) minutesBySubject.set(s.subjectId, (minutesBySubject.get(s.subjectId) ?? 0) + s.durationMin);

    const withQuestions = inWeek.filter((s) => s.questionsTotal != null && s.questionsTotal > 0);
    const totalQuestions = withQuestions.reduce((sum, s) => sum + (s.questionsTotal ?? 0), 0);
    const totalCorrect = withQuestions.reduce((sum, s) => sum + (s.questionsCorrect ?? 0), 0);

    return [
      weekStart,
      round1(totalMinutes / 60),
      ...subjects.map((subject) => round1((minutesBySubject.get(subject.id) ?? 0) / 60)),
      totalQuestions,
      totalQuestions > 0 ? round1((totalCorrect / totalQuestions) * 100) / 100 : null,
    ] satisfies ExportCell[];
  });

  return { columns, rows };
}

// ---------------------------------------------------------------------------
// Grade do calendário
// ---------------------------------------------------------------------------

export interface GradeCell {
  subjectName: string;
  typeLabel: string;
  color: string;
  status: Block["status"];
}

export interface GradeWeekSection {
  weekLabel: string;
  weekStart: Date;
  timeSlots: string[];
  reviewsByDay: string[]; // 7 entradas, seg..dom
  grid: (GradeCell | null)[][]; // [timeSlotIndex][weekdayIndex 0=seg..6=dom]
}

export function buildGradeCalendario(blocks: Block[], subjects: Subject[], reviews: Review[], range: ExportRange): GradeWeekSection[] {
  const inRangeBlocks = blocks.filter((b) => inRange(new Date(b.startAt), range));
  if (inRangeBlocks.length === 0) return [];

  const weekStartsSet = new Map<string, Date>();
  for (const block of inRangeBlocks) {
    const weekStart = startOfWeek(new Date(block.startAt), WEEK_OPTS);
    weekStartsSet.set(format(weekStart, "yyyy-MM-dd"), weekStart);
  }

  const sortedWeekStarts = Array.from(weekStartsSet.values()).sort((a, b) => a.getTime() - b.getTime());

  return sortedWeekStarts.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, WEEK_OPTS);
    const weekBlocks = inRangeBlocks.filter((b) => {
      const startAt = new Date(b.startAt);
      return startAt >= weekStart && startAt <= weekEnd;
    });

    const timeSlots = Array.from(new Set(weekBlocks.map((b) => format(new Date(b.startAt), "HH:mm")))).sort();

    const grid: (GradeCell | null)[][] = timeSlots.map(() => Array.from({ length: 7 }, () => null));
    for (const block of weekBlocks) {
      const startAt = new Date(block.startAt);
      const slotIndex = timeSlots.indexOf(format(startAt, "HH:mm"));
      const weekdayIndex = (startAt.getDay() + 6) % 7; // getDay(): 0=dom..6=sáb -> 0=seg..6=dom
      const subject = subjects.find((s) => s.id === block.subjectId);
      grid[slotIndex][weekdayIndex] = {
        subjectName: subject?.name ?? "Matéria",
        typeLabel: BLOCK_TYPE_LABELS[block.type],
        color: subject?.color ?? "#8b5cf6",
        status: block.status,
      };
    }

    const reviewsByDay = Array.from({ length: 7 }, (_, weekdayIndex) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + weekdayIndex);
      const dayStr = format(dayDate, "yyyy-MM-dd");
      const dueNames = reviews.filter((r) => r.status === "pending" && r.dueDate === dayStr).map((r) => subjectName(subjects, r.subjectId));
      return [...new Set(dueNames)].join(", ");
    });

    return {
      weekLabel: `Semana de ${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM")}`,
      weekStart,
      timeSlots,
      reviewsByDay,
      grid,
    } satisfies GradeWeekSection;
  });
}
