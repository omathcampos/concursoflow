import { describe, expect, it } from "vitest";

import {
  canSendNotification,
  isLinkCodeValid,
  renderDailyEmailHtml,
  renderDailyEmailText,
  renderDailyTelegramHtml,
  renderOverdueEmailHtml,
  renderOverdueTelegramHtml,
  renderWeeklyEmailHtml,
  renderWeeklyTelegramHtml,
  shouldSendDaily,
  shouldSendOverdue,
  shouldSendWeekly,
  type DailyContent,
  type NotificationLogEntry,
  type OverdueContent,
  type WeeklyContent,
} from "@/lib/domain/notifications";

function makeDaily(overrides: Partial<DailyContent> = {}): DailyContent {
  return { type: "daily", dateLabel: "sexta-feira, 24 de julho", blocks: [], reviewsCount: 0, reviewSubjectNames: [], ...overrides };
}

function makeWeekly(overrides: Partial<WeeklyContent> = {}): WeeklyContent {
  return {
    type: "weekly",
    hoursThisWeek: 0,
    hoursLastWeek: 0,
    deltaPercent: null,
    hoursBySubject: [],
    accuracy: null,
    streak: 0,
    topOverdue: [],
    ...overrides,
  };
}

function makeOverdue(overrides: Partial<OverdueContent> = {}): OverdueContent {
  return { type: "overdue", items: [], ...overrides };
}

describe("shouldSendDaily", () => {
  it("não envia em dia vazio (sem blocos e sem revisões)", () => {
    expect(shouldSendDaily(makeDaily())).toBe(false);
  });

  it("envia quando há blocos", () => {
    expect(
      shouldSendDaily(makeDaily({ blocks: [{ subjectName: "Português", subjectColor: "#3b82f6", type: "teoria", startTime: "08:00", endTime: "09:00" }] })),
    ).toBe(true);
  });

  it("envia quando há revisões pendentes, mesmo sem blocos", () => {
    expect(shouldSendDaily(makeDaily({ reviewsCount: 2, reviewSubjectNames: ["Português"] }))).toBe(true);
  });
});

describe("shouldSendWeekly", () => {
  it("não envia em semana sem estudo", () => {
    expect(shouldSendWeekly(makeWeekly({ hoursThisWeek: 0 }))).toBe(false);
  });

  it("envia quando há horas estudadas", () => {
    expect(shouldSendWeekly(makeWeekly({ hoursThisWeek: 5 }))).toBe(true);
  });
});

describe("shouldSendOverdue", () => {
  it("não envia sem revisões atrasadas", () => {
    expect(shouldSendOverdue(makeOverdue())).toBe(false);
  });

  it("envia quando há atrasadas", () => {
    expect(shouldSendOverdue(makeOverdue({ items: [{ subjectName: "Português", count: 1, maxDaysLate: 3 }] }))).toBe(true);
  });
});

describe("canSendNotification", () => {
  const now = new Date("2026-07-24T10:00:00");

  it("permite o primeiro envio (sem log anterior)", () => {
    expect(canSendNotification([], "daily", "email", now)).toBe(true);
  });

  it("daily/weekly: bloqueia um segundo envio no mesmo dia civil", () => {
    const logs: NotificationLogEntry[] = [{ type: "daily", channel: "email", sentAt: "2026-07-24T07:00:00" }];
    expect(canSendNotification(logs, "daily", "email", now)).toBe(false);
  });

  it("daily/weekly: permite envio em outro dia", () => {
    const logs: NotificationLogEntry[] = [{ type: "daily", channel: "email", sentAt: "2026-07-23T07:00:00" }];
    expect(canSendNotification(logs, "daily", "email", now)).toBe(true);
  });

  it("não confunde canais diferentes (log de email não bloqueia telegram)", () => {
    const logs: NotificationLogEntry[] = [{ type: "daily", channel: "email", sentAt: "2026-07-24T07:00:00" }];
    expect(canSendNotification(logs, "daily", "telegram", now)).toBe(true);
  });

  it("overdue: bloqueia dentro da janela de 3 dias", () => {
    const logs: NotificationLogEntry[] = [{ type: "overdue", channel: "email", sentAt: "2026-07-23T12:00:00" }];
    expect(canSendNotification(logs, "overdue", "email", now)).toBe(false);
  });

  it("overdue: permite após 3 dias", () => {
    const logs: NotificationLogEntry[] = [{ type: "overdue", channel: "email", sentAt: "2026-07-21T12:00:00" }];
    expect(canSendNotification(logs, "overdue", "email", now)).toBe(true);
  });
});

describe("isLinkCodeValid", () => {
  const now = new Date("2026-07-24T10:00:00");

  it("válido: não usado e não expirado", () => {
    expect(isLinkCodeValid({ usedAt: null, expiresAt: "2026-07-24T10:05:00" }, now)).toBe(true);
  });

  it("inválido: já usado", () => {
    expect(isLinkCodeValid({ usedAt: "2026-07-24T09:00:00", expiresAt: "2026-07-24T10:05:00" }, now)).toBe(false);
  });

  it("inválido: expirado", () => {
    expect(isLinkCodeValid({ usedAt: null, expiresAt: "2026-07-24T09:55:00" }, now)).toBe(false);
  });
});

describe("renderizadores de conteúdo", () => {
  it("email diário inclui os blocos, revisões e link de descadastro", () => {
    const content = makeDaily({
      blocks: [{ subjectName: "Direito Constitucional", subjectColor: "#3b82f6", type: "teoria", startTime: "08:00", endTime: "09:00" }],
      reviewsCount: 2,
      reviewSubjectNames: ["Português"],
    });
    const html = renderDailyEmailHtml(content, "Ana");
    expect(html).toContain("Direito Constitucional");
    expect(html).toContain("08:00");
    expect(html).toContain("2");
    expect(html).toContain("{{UNSUBSCRIBE_URL}}");
    expect(html).toContain("Ana");

    const text = renderDailyEmailText(content, "Ana");
    expect(text).toContain("Direito Constitucional");
    expect(text).not.toContain("<");
  });

  it("telegram diário usa HTML compacto (sem tabelas)", () => {
    const content = makeDaily({ blocks: [{ subjectName: "Português", subjectColor: "#3b82f6", type: "teoria", startTime: "08:00", endTime: "09:00" }] });
    const html = renderDailyTelegramHtml(content);
    expect(html).not.toContain("<table");
    expect(html).toContain("<b>");
    expect(html).toContain("Português");
  });

  it("email semanal mostra horas, delta e matérias atrasadas", () => {
    const content = makeWeekly({ hoursThisWeek: 10, deltaPercent: 25, hoursBySubject: [{ name: "Português", hours: 5 }], topOverdue: [{ name: "Matemática", count: 2, maxDaysLate: 5 }] });
    const html = renderWeeklyEmailHtml(content, null);
    expect(html).toContain("10h");
    expect(html).toContain("+25%");
    expect(html).toContain("Matemática");

    const telegram = renderWeeklyTelegramHtml(content);
    expect(telegram).toContain("10h");
    expect(telegram).not.toContain("<table");
  });

  it("email de atrasadas lista as matérias e dias de atraso", () => {
    const content = makeOverdue({ items: [{ subjectName: "Português", count: 3, maxDaysLate: 7 }] });
    const html = renderOverdueEmailHtml(content, "Ana");
    expect(html).toContain("Português");
    expect(html).toContain("7d");

    const telegram = renderOverdueTelegramHtml(content);
    expect(telegram).toContain("Português");
  });
});
