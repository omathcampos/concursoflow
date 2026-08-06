import { addDays, startOfWeek as dateFnsStartOfWeek } from "date-fns";

import type { BlockType } from "@/lib/data/types";

export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;
export const SLOT_MINUTES = 30;
export const ROW_HEIGHT_PX = 28;
export const SLOTS_PER_DAY = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;
export const GRID_HEIGHT_PX = SLOTS_PER_DAY * ROW_HEIGHT_PX;

export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
  lei_seca: "Lei seca",
  aula: "Aula",
};

export function startOfWeek(date: Date): Date {
  return dateFnsStartOfWeek(date, { weekStartsOn: 1 });
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Minutos desde o início do dia da grade (05:00), sem clamping. */
function minutesSinceGridStart(date: Date): number {
  return (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes();
}

export function topForDate(date: Date): number {
  return (minutesSinceGridStart(date) / SLOT_MINUTES) * ROW_HEIGHT_PX;
}

export function heightForDuration(durationMinutes: number): number {
  return (durationMinutes / SLOT_MINUTES) * ROW_HEIGHT_PX;
}

/** Converte um deslocamento vertical em pixels para minutos, arredondado ao slot de 30min. */
export function pixelsToSlotMinutes(px: number): number {
  return Math.round(px / ROW_HEIGHT_PX) * SLOT_MINUTES;
}

/** Dado um clique em uma célula (offset em px a partir do topo da coluna do dia), retorna a hora/minuto. */
export function slotFromOffset(offsetPx: number): { hours: number; minutes: number } {
  const totalMinutes = DAY_START_HOUR * 60 + pixelsToSlotMinutes(offsetPx);
  const clamped = Math.min(Math.max(totalMinutes, DAY_START_HOUR * 60), (DAY_END_HOUR - 0.5) * 60);
  return { hours: Math.floor(clamped / 60), minutes: clamped % 60 };
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Posição em px (scrollTop) de uma hora cheia dentro da grade — usado pelo auto-scroll inicial. */
export function scrollTopForHour(hour: number): number {
  return ((hour - DAY_START_HOUR) * 60 / SLOT_MINUTES) * ROW_HEIGHT_PX;
}
