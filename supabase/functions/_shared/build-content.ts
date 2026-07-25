// Consulta o banco (via admin client) e monta o conteúdo de cada tipo de
// notificação para um usuário. Duplica minimamente a agregação de
// src/lib/domain/stats.ts (ver nota em types.ts) — aqui em SQL/TS híbrido,
// já que o Deno não importa os módulos do app Next.js.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { DailyContent, LocalBounds, OverdueContent, WeeklyContent } from "./types.ts";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function sum(rows: Array<Record<string, unknown>> | null, key: string): number {
  return (rows ?? []).reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
}

function formatLocalTime(isoUtc: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(isoUtc));
}

function formatLocalDate(isoUtc: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(isoUtc));
}

function formatDateLabel(localDateStr: string): string {
  const d = new Date(`${localDateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

function daysBetween(localDateStr: string, dueDateStr: string): number {
  const a = new Date(`${localDateStr}T00:00:00Z`).getTime();
  const b = new Date(`${dueDateStr}T00:00:00Z`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function addDays(localDateStr: string, days: number): string {
  const d = new Date(`${localDateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getLocalBounds(admin: SupabaseClient, timezone: string, now: Date): Promise<LocalBounds> {
  const { data, error } = await admin.rpc("notif_local_bounds", { p_timezone: timezone, p_now: now.toISOString() }).single();
  if (error || !data) throw new Error(`notif_local_bounds falhou: ${error?.message}`);
  return data as LocalBounds;
}

export async function buildDailyContent(admin: SupabaseClient, userId: string, timezone: string, bounds: LocalBounds): Promise<DailyContent> {
  const { data: blocksData } = await admin
    .from("blocks")
    .select("type, start_at, end_at, subjects(name, color)")
    .eq("user_id", userId)
    .eq("status", "planned")
    .gte("start_at", bounds.day_start)
    .lt("start_at", bounds.day_end)
    .order("start_at");

  type BlockRow = { type: DailyContent["blocks"][number]["type"]; start_at: string; end_at: string; subjects: { name: string; color: string } | null };
  const blocks = ((blocksData ?? []) as unknown as BlockRow[]).map((b) => ({
    subjectName: b.subjects?.name ?? "Matéria",
    subjectColor: b.subjects?.color ?? "#8b5cf6",
    type: b.type,
    startTime: formatLocalTime(b.start_at, timezone),
    endTime: formatLocalTime(b.end_at, timezone),
  }));

  const { data: reviewsData } = await admin
    .from("reviews")
    .select("subjects(name)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lte("due_date", bounds.local_date);

  type ReviewRow = { subjects: { name: string } | null };
  const reviewRows = (reviewsData ?? []) as unknown as ReviewRow[];
  const reviewSubjectNames = [...new Set(reviewRows.map((r) => r.subjects?.name ?? "Matéria"))];

  return { type: "daily", dateLabel: formatDateLabel(bounds.local_date), blocks, reviewsCount: reviewRows.length, reviewSubjectNames };
}

async function computeStreak(admin: SupabaseClient, userId: string, timezone: string, localDateStr: string): Promise<number> {
  const since = addDays(localDateStr, -60);
  const { data } = await admin.from("sessions").select("started_at").eq("user_id", userId).gte("started_at", `${since}T00:00:00Z`);
  const daysWithSession = new Set(((data ?? []) as Array<{ started_at: string }>).map((s) => formatLocalDate(s.started_at, timezone)));

  let cursor = localDateStr;
  if (!daysWithSession.has(cursor)) cursor = addDays(cursor, -1);

  let streak = 0;
  while (daysWithSession.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function buildWeeklyContent(admin: SupabaseClient, userId: string, timezone: string, bounds: LocalBounds): Promise<WeeklyContent> {
  type SessionRow = { duration_min: number; questions_total: number | null; questions_correct: number | null; subjects: { name: string } | null };

  const { data: thisWeekData } = await admin
    .from("sessions")
    .select("duration_min, questions_total, questions_correct, subjects(name)")
    .eq("user_id", userId)
    .gte("started_at", bounds.week_start)
    .lt("started_at", bounds.week_end);
  const { data: lastWeekData } = await admin
    .from("sessions")
    .select("duration_min")
    .eq("user_id", userId)
    .gte("started_at", bounds.prev_week_start)
    .lt("started_at", bounds.week_start);

  const thisWeek = (thisWeekData ?? []) as unknown as SessionRow[];
  const hoursThisWeek = round1(sum(thisWeek, "duration_min") / 60);
  const hoursLastWeek = round1(sum((lastWeekData ?? []) as Array<Record<string, unknown>>, "duration_min") / 60);
  const deltaPercent = hoursLastWeek === 0 ? (hoursThisWeek === 0 ? 0 : null) : Math.round(((hoursThisWeek - hoursLastWeek) / hoursLastWeek) * 100);

  const bySubject = new Map<string, number>();
  for (const s of thisWeek) {
    const name = s.subjects?.name ?? "Matéria";
    bySubject.set(name, (bySubject.get(name) ?? 0) + s.duration_min);
  }
  const hoursBySubject = [...bySubject.entries()].map(([name, min]) => ({ name, hours: round1(min / 60) })).sort((a, b) => b.hours - a.hours);

  const withQuestions = thisWeek.filter((s) => s.questions_total != null && s.questions_total > 0);
  const totalQ = withQuestions.reduce((acc, s) => acc + (s.questions_total ?? 0), 0);
  const correctQ = withQuestions.reduce((acc, s) => acc + (s.questions_correct ?? 0), 0);
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : null;

  const streak = await computeStreak(admin, userId, timezone, bounds.local_date);

  const { data: overdueData } = await admin
    .from("reviews")
    .select("due_date, subjects(name)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("due_date", bounds.local_date);
  type OverdueRow = { due_date: string; subjects: { name: string } | null };
  const overdueBySubject = new Map<string, { count: number; maxDaysLate: number }>();
  for (const r of (overdueData ?? []) as unknown as OverdueRow[]) {
    const name = r.subjects?.name ?? "Matéria";
    const acc = overdueBySubject.get(name) ?? { count: 0, maxDaysLate: 0 };
    acc.count += 1;
    acc.maxDaysLate = Math.max(acc.maxDaysLate, daysBetween(bounds.local_date, r.due_date));
    overdueBySubject.set(name, acc);
  }
  const topOverdue = [...overdueBySubject.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.maxDaysLate - a.maxDaysLate || b.count - a.count)
    .slice(0, 3);

  return { type: "weekly", hoursThisWeek, hoursLastWeek, deltaPercent, hoursBySubject, accuracy, streak, topOverdue };
}

/** Alerta de atrasadas: revisões vencidas há 2+ dias. */
export async function buildOverdueContent(admin: SupabaseClient, userId: string, bounds: LocalBounds): Promise<OverdueContent> {
  const cutoff = addDays(bounds.local_date, -2);
  const { data } = await admin
    .from("reviews")
    .select("due_date, subjects(name)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lte("due_date", cutoff);

  type OverdueRow = { due_date: string; subjects: { name: string } | null };
  const bySubject = new Map<string, { count: number; maxDaysLate: number }>();
  for (const r of (data ?? []) as unknown as OverdueRow[]) {
    const name = r.subjects?.name ?? "Matéria";
    const acc = bySubject.get(name) ?? { count: 0, maxDaysLate: 0 };
    acc.count += 1;
    acc.maxDaysLate = Math.max(acc.maxDaysLate, daysBetween(bounds.local_date, r.due_date));
    bySubject.set(name, acc);
  }
  const items = [...bySubject.entries()]
    .map(([subjectName, v]) => ({ subjectName, ...v }))
    .sort((a, b) => b.maxDaysLate - a.maxDaysLate);

  return { type: "overdue", items };
}
