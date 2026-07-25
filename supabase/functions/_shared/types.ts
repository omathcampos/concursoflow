// Tipos compartilhados pelas Edge Functions de notificação. Espelham (sem
// depender de) src/lib/data/types.ts e src/lib/domain/notifications.ts do
// app Next.js — Deno não importa módulos do projeto diretamente, então esses
// tipos e a lógica pura em notifications.ts são duplicados aqui de forma
// mínima e documentada (ver prompts/fase-10-notificacoes.md).

export type BlockType = "teoria" | "questoes" | "revisao" | "lei_seca" | "aula";

export interface DailyBlockItem {
  subjectName: string;
  subjectColor: string;
  type: BlockType;
  startTime: string;
  endTime: string;
}

export interface DailyContent {
  type: "daily";
  dateLabel: string;
  blocks: DailyBlockItem[];
  reviewsCount: number;
  reviewSubjectNames: string[];
}

export interface WeeklySubjectHours {
  name: string;
  hours: number;
}

export interface WeeklyOverdueItem {
  name: string;
  count: number;
  maxDaysLate: number;
}

export interface WeeklyContent {
  type: "weekly";
  hoursThisWeek: number;
  hoursLastWeek: number;
  deltaPercent: number | null;
  hoursBySubject: WeeklySubjectHours[];
  accuracy: number | null;
  streak: number;
  topOverdue: WeeklyOverdueItem[];
}

export interface OverdueItem {
  subjectName: string;
  count: number;
  maxDaysLate: number;
}

export interface OverdueContent {
  type: "overdue";
  items: OverdueItem[];
}

export type NotificationContent = DailyContent | WeeklyContent | OverdueContent;

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

export interface LocalBounds {
  day_start: string;
  day_end: string;
  week_start: string;
  week_end: string;
  prev_week_start: string;
  is_sunday: boolean;
  local_hour: number;
  local_date: string;
}
