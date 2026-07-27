// Geração de feed iCalendar (RFC 5545) com os blocos de estudo do usuário —
// consumido pelo endpoint público de assinatura (Google Agenda/Apple
// Calendar/Outlook) e pelo botão "Baixar .ics" da página Calendário.
//
// Decisão: DTSTART/DTEND usam sempre horário UTC (sufixo "Z"), nunca
// TZID+VTIMEZONE. Os timestamps de blocks já são instantes UTC no banco;
// todo cliente de calendário (Google/Apple/Outlook) converte um instante UTC
// para o fuso do dispositivo automaticamente — funcionalmente idêntico a um
// VTIMEZONE customizado, sem o risco de errar as regras de transição na mão.
import type { BlockStatus, BlockType } from "@/lib/data/types";

export interface ICalBlock {
  id: string;
  subjectId: string;
  topicName: string | null;
  type: BlockType;
  status: BlockStatus;
  startAt: string; // ISO UTC
  endAt: string; // ISO UTC
  notes: string | null;
}

export interface ICalSubject {
  id: string;
  name: string;
}

export interface ICalReview {
  id: string;
  subjectId: string;
  dueDate: string; // YYYY-MM-DD
}

export interface BuildICalFeedOptions {
  calName?: string;
  reviews?: ICalReview[];
  /** Instante usado como DTSTAMP/LAST-MODIFIED — injetável para testes determinísticos. */
  now?: Date;
}

const FEED_WINDOW_DAYS_PAST = 30;
const FEED_WINDOW_DAYS_FUTURE = 90;
const DAY_MS = 86_400_000;

/** Blocos de -30 a +90 dias a partir de `now` — não manda a vida inteira do usuário no feed. */
export function filterBlocksForFeed<T extends { startAt: string }>(blocks: T[], now: Date = new Date()): T[] {
  const lowerBound = now.getTime() - FEED_WINDOW_DAYS_PAST * DAY_MS;
  const upperBound = now.getTime() + FEED_WINDOW_DAYS_FUTURE * DAY_MS;
  return blocks.filter((b) => {
    const t = new Date(b.startAt).getTime();
    return t >= lowerBound && t <= upperBound;
  });
}

const BLOCK_TYPE_EMOJI: Record<BlockType, string> = {
  teoria: "📖",
  questoes: "✏️",
  revisao: "🔁",
  lei_seca: "⚖️",
  aula: "🎓",
};

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
  lei_seca: "Lei seca",
  aula: "Aula",
};

/** RFC 5545 §3.3.11: escapa vírgula, ponto-e-vírgula, barra invertida e quebra de linha. */
function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\n|\r/g, "\\n");
}

/** Formata um Date como "YYYYMMDDTHHMMSSZ" (UTC). */
function formatDateTimeUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Formata uma data local "YYYY-MM-DD" como "YYYYMMDD" (VALUE=DATE, dia inteiro). */
function formatDateOnly(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function addDaysToDateOnly(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** RFC 5545 §3.1: linhas não devem passar de 75 octetos; continuação prefixada por um espaço. Fold sempre em fronteira de code point, nunca no meio de um caractere multi-byte. */
function foldLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  const limit = () => (chunks.length === 0 ? 75 : 74);

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, "utf8");
    if (currentBytes + charBytes > limit()) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }
  if (current) chunks.push(current);

  return chunks.map((chunk, i) => (i === 0 ? chunk : ` ${chunk}`)).join("\r\n");
}

function buildLine(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

function subjectName(subjects: ICalSubject[], subjectId: string): string {
  return subjects.find((s) => s.id === subjectId)?.name ?? "Matéria";
}

const STATUS_BY_BLOCK_STATUS: Record<BlockStatus, string> = {
  planned: "CONFIRMED",
  done: "CONFIRMED",
  skipped: "CANCELLED",
};

const CATEGORY_BY_BLOCK_STATUS: Record<BlockStatus, string> = {
  planned: "PLANEJADO",
  done: "CONCLUÍDO",
  skipped: "PULADO",
};

function buildBlockEvent(block: ICalBlock, subjects: ICalSubject[], now: Date): string[] {
  const name = subjectName(subjects, block.subjectId);
  const summary = block.topicName ? `${name} — ${block.topicName}` : name;
  const descriptionParts = [BLOCK_TYPE_LABELS[block.type], block.notes].filter((p): p is string => Boolean(p));

  const lines = [
    "BEGIN:VEVENT",
    buildLine("UID", `${block.id}@concursoflow.com`),
    buildLine("DTSTAMP", formatDateTimeUtc(now.toISOString())),
    buildLine("LAST-MODIFIED", formatDateTimeUtc(now.toISOString())),
    buildLine("DTSTART", formatDateTimeUtc(block.startAt)),
    buildLine("DTEND", formatDateTimeUtc(block.endAt)),
    buildLine("SUMMARY", escapeText(`${BLOCK_TYPE_EMOJI[block.type]} ${summary}`)),
    buildLine("STATUS", STATUS_BY_BLOCK_STATUS[block.status]),
    buildLine("CATEGORIES", CATEGORY_BY_BLOCK_STATUS[block.status]),
  ];
  if (descriptionParts.length > 0) lines.push(buildLine("DESCRIPTION", escapeText(descriptionParts.join("\n"))));
  lines.push("END:VEVENT");
  return lines;
}

function buildReviewEvent(review: ICalReview, subjects: ICalSubject[], now: Date): string[] {
  const name = subjectName(subjects, review.subjectId);
  return [
    "BEGIN:VEVENT",
    buildLine("UID", `review-${review.id}@concursoflow.com`),
    buildLine("DTSTAMP", formatDateTimeUtc(now.toISOString())),
    buildLine("DTSTART;VALUE=DATE", formatDateOnly(review.dueDate)),
    buildLine("DTEND;VALUE=DATE", formatDateOnly(addDaysToDateOnly(review.dueDate, 1))),
    buildLine("SUMMARY", escapeText(`📚 Revisão — ${name}`)),
    buildLine("STATUS", "CONFIRMED"),
    "END:VEVENT",
  ];
}

/** Monta o .ics completo (RFC 5545) a partir dos blocos (e, opcionalmente, revisões pendentes) de um usuário. Função pura — a janela de tempo (-30/+90 dias) é responsabilidade de `filterBlocksForFeed`, chamada antes pelo caller. */
export function buildICalFeed(blocks: ICalBlock[], subjects: ICalSubject[], opts: BuildICalFeedOptions = {}): string {
  const now = opts.now ?? new Date();
  const calName = opts.calName ?? "ConcursoFlow";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    buildLine("PRODID", "-//ConcursoFlow//Feed de Estudos//PT"),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    buildLine("X-WR-CALNAME", calName),
    ...blocks.flatMap((b) => buildBlockEvent(b, subjects, now)),
    ...(opts.reviews ?? []).flatMap((r) => buildReviewEvent(r, subjects, now)),
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
