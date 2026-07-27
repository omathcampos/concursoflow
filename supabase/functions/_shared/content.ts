// Lógica pura de montagem/renderização de conteúdo — cópia Deno-safe de
// src/lib/domain/notifications.ts (ver nota em types.ts). Mantida em sincronia
// manual; qualquer mudança de regra de negócio deve refletir nos dois lados.

import type { BlockType, DailyContent, NotificationContent, OverdueContent, WeeklyContent } from "./types.ts";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
  lei_seca: "Lei seca",
  aula: "Aula",
};

export function shouldSendDaily(content: DailyContent): boolean {
  return content.blocks.length > 0 || content.reviewsCount > 0;
}

export function shouldSendWeekly(content: WeeklyContent): boolean {
  return content.hoursThisWeek > 0;
}

export function shouldSendOverdue(content: OverdueContent): boolean {
  return content.items.length > 0;
}

export function shouldSend(content: NotificationContent): boolean {
  if (content.type === "daily") return shouldSendDaily(content);
  if (content.type === "weekly") return shouldSendWeekly(content);
  return shouldSendOverdue(content);
}

export function isLinkCodeValid(linkCode: { used_at: string | null; expires_at: string }, now: Date = new Date()): boolean {
  if (linkCode.used_at !== null) return false;
  return new Date(linkCode.expires_at) > now;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BRAND_PURPLE = "#7c3aed";
const LOGO_URL = "https://concursoflow.com/icon-192.png";

function emailShell(bodyHtml: string, unsubscribeUrl: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#18181b;line-height:1.5;">
<div style="padding:16px 0;display:flex;align-items:center;gap:8px;">
<img src="${LOGO_URL}" width="28" height="28" alt="ConcursoFlow" style="border-radius:8px;vertical-align:middle;" />
<span style="color:${BRAND_PURPLE};font-size:20px;font-weight:700;vertical-align:middle;">ConcursoFlow</span>
</div>
${bodyHtml}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;" />
<p style="font-size:12px;color:#71717a;">Não quer mais receber este email? <a href="${unsubscribeUrl}" style="color:${BRAND_PURPLE};">Cancelar inscrição</a>.</p>
</div>`;
}

export function renderDailyEmailHtml(content: DailyContent, displayName: string | null, unsubscribeUrl: string): string {
  const greeting = displayName ? `Bom dia, ${escapeHtml(displayName)}!` : "Bom dia!";
  const blocksHtml = content.blocks
    .map(
      (b) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${b.subjectColor};margin-right:8px;"></span><strong>${escapeHtml(b.subjectName)}</strong> — ${BLOCK_TYPE_LABELS[b.type]} (${b.startTime}–${b.endTime})</td></tr>`,
    )
    .join("");
  const blocksSection =
    content.blocks.length > 0
      ? `<table style="width:100%;border-collapse:collapse;">${blocksHtml}</table>`
      : `<p style="color:#71717a;">Nenhum bloco agendado para hoje.</p>`;
  const reviewsSection =
    content.reviewsCount > 0
      ? `<p style="margin:16px 0 0;">📚 Você tem <strong>${content.reviewsCount}</strong> revisão(ões) pendente(s) hoje: ${escapeHtml(content.reviewSubjectNames.join(", "))}.</p>`
      : "";
  return emailShell(`<p>${greeting} Aqui está o seu ${escapeHtml(content.dateLabel)}:</p>${blocksSection}${reviewsSection}`, unsubscribeUrl);
}

export function renderDailyEmailText(content: DailyContent, displayName: string | null): string {
  const greeting = displayName ? `Bom dia, ${displayName}!` : "Bom dia!";
  const lines = [
    `${greeting} Aqui está o seu ${content.dateLabel}:`,
    "",
    ...(content.blocks.length > 0
      ? content.blocks.map((b) => `- ${b.subjectName} — ${BLOCK_TYPE_LABELS[b.type]} (${b.startTime}–${b.endTime})`)
      : ["Nenhum bloco agendado para hoje."]),
  ];
  if (content.reviewsCount > 0) {
    lines.push("", `📚 Você tem ${content.reviewsCount} revisão(ões) pendente(s) hoje: ${content.reviewSubjectNames.join(", ")}.`);
  }
  return lines.join("\n");
}

export function renderDailyTelegramHtml(content: DailyContent): string {
  const lines = [`<b>☀️ ${escapeHtml(content.dateLabel)}</b>`, ""];
  if (content.blocks.length > 0) {
    lines.push(...content.blocks.map((b) => `• <b>${escapeHtml(b.subjectName)}</b> — ${BLOCK_TYPE_LABELS[b.type]} (${b.startTime}–${b.endTime})`));
  } else {
    lines.push("Nenhum bloco agendado para hoje.");
  }
  if (content.reviewsCount > 0) {
    lines.push("", `📚 <b>${content.reviewsCount}</b> revisão(ões) pendente(s): ${escapeHtml(content.reviewSubjectNames.join(", "))}`);
  }
  return lines.join("\n");
}

function formatDelta(deltaPercent: number | null): string {
  if (deltaPercent === null) return "";
  const sign = deltaPercent >= 0 ? "+" : "";
  return ` (${sign}${deltaPercent}% vs. semana anterior)`;
}

export function renderWeeklyEmailHtml(content: WeeklyContent, displayName: string | null, unsubscribeUrl: string): string {
  const greeting = displayName ? `Olá, ${escapeHtml(displayName)}!` : "Olá!";
  const subjectsHtml = content.hoursBySubject
    .map((s) => `<tr><td style="padding:4px 0;">${escapeHtml(s.name)}</td><td style="padding:4px 0;text-align:right;">${s.hours}h</td></tr>`)
    .join("");
  const overdueHtml =
    content.topOverdue.length > 0
      ? `<p style="margin:16px 0 4px;"><strong>Matérias mais atrasadas:</strong></p><ul>${content.topOverdue.map((o) => `<li>${escapeHtml(o.name)} — ${o.count} revisão(ões), ${o.maxDaysLate}d de atraso</li>`).join("")}</ul>`
      : "";
  return emailShell(
    `
<p>${greeting} Seu resumo da semana:</p>
<p style="font-size:24px;font-weight:700;margin:8px 0;">${content.hoursThisWeek}h${formatDelta(content.deltaPercent)}</p>
${content.accuracy !== null ? `<p>✅ ${content.accuracy}% de acerto nas questões</p>` : ""}
<p>🔥 ${content.streak} dia(s) de streak</p>
${content.hoursBySubject.length > 0 ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${subjectsHtml}</table>` : ""}
${overdueHtml}
`,
    unsubscribeUrl,
  );
}

export function renderWeeklyEmailText(content: WeeklyContent, displayName: string | null): string {
  const greeting = displayName ? `Olá, ${displayName}!` : "Olá!";
  const lines = [`${greeting} Seu resumo da semana:`, "", `Horas estudadas: ${content.hoursThisWeek}h${formatDelta(content.deltaPercent)}`];
  if (content.accuracy !== null) lines.push(`% de acerto: ${content.accuracy}%`);
  lines.push(`Streak: ${content.streak} dia(s)`);
  if (content.hoursBySubject.length > 0) {
    lines.push("", "Horas por matéria:", ...content.hoursBySubject.map((s) => `- ${s.name}: ${s.hours}h`));
  }
  if (content.topOverdue.length > 0) {
    lines.push("", "Matérias mais atrasadas:", ...content.topOverdue.map((o) => `- ${o.name}: ${o.count} revisão(ões), ${o.maxDaysLate}d de atraso`));
  }
  return lines.join("\n");
}

export function renderWeeklyTelegramHtml(content: WeeklyContent): string {
  const lines = [`<b>📊 Resumo da semana</b>`, "", `⏱ <b>${content.hoursThisWeek}h</b> estudadas${formatDelta(content.deltaPercent)}`];
  if (content.accuracy !== null) lines.push(`✅ ${content.accuracy}% de acerto`);
  lines.push(`🔥 ${content.streak} dia(s) de streak`);
  if (content.topOverdue.length > 0) {
    lines.push("", "<b>Mais atrasadas:</b>", ...content.topOverdue.map((o) => `• ${escapeHtml(o.name)} (${o.count}, ${o.maxDaysLate}d)`));
  }
  return lines.join("\n");
}

export function renderOverdueEmailHtml(content: OverdueContent, displayName: string | null, unsubscribeUrl: string): string {
  const greeting = displayName ? `${escapeHtml(displayName)}, ` : "";
  const itemsHtml = content.items
    .map((i) => `<li><strong>${escapeHtml(i.subjectName)}</strong> — ${i.count} revisão(ões), até ${i.maxDaysLate}d de atraso</li>`)
    .join("");
  return emailShell(`<p>⏰ ${greeting}você tem revisões atrasadas:</p><ul>${itemsHtml}</ul>`, unsubscribeUrl);
}

export function renderOverdueEmailText(content: OverdueContent, displayName: string | null): string {
  const greeting = displayName ? `${displayName}, ` : "";
  return [
    `⏰ ${greeting}você tem revisões atrasadas:`,
    "",
    ...content.items.map((i) => `- ${i.subjectName}: ${i.count} revisão(ões), até ${i.maxDaysLate}d de atraso`),
  ].join("\n");
}

export function renderOverdueTelegramHtml(content: OverdueContent): string {
  return [
    `<b>⏰ Revisões atrasadas</b>`,
    "",
    ...content.items.map((i) => `• <b>${escapeHtml(i.subjectName)}</b> — ${i.count} revisão(ões), até ${i.maxDaysLate}d`),
  ].join("\n");
}
