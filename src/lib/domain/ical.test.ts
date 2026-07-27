import ical from "node-ical";
import type { CalendarComponent, VEvent } from "node-ical";
import { describe, expect, it } from "vitest";

import { buildICalFeed, filterBlocksForFeed, type ICalBlock, type ICalReview, type ICalSubject } from "@/lib/domain/ical";

function isVEvent(component: CalendarComponent): component is VEvent {
  return component.type === "VEVENT";
}

function getEvents(icsString: string): VEvent[] {
  return Object.values(ical.sync.parseICS(icsString)).filter((c): c is VEvent => c !== undefined && isVEvent(c));
}

function getFirstEvent(icsString: string): VEvent {
  const event = getEvents(icsString)[0];
  if (!event) throw new Error("Nenhum VEVENT encontrado no .ics.");
  return event;
}

function block(overrides: Partial<ICalBlock> = {}): ICalBlock {
  return {
    id: "block-1",
    subjectId: "subj-1",
    topicName: null,
    type: "teoria",
    status: "planned",
    startAt: "2026-08-01T12:00:00.000Z",
    endAt: "2026-08-01T13:00:00.000Z",
    notes: null,
    ...overrides,
  };
}

const subjects: ICalSubject[] = [{ id: "subj-1", name: "Direito Constitucional" }];

describe("buildICalFeed", () => {
  it("produz um VCALENDAR válido e parseável", () => {
    const ics = buildICalFeed([block()], subjects);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("PRODID:");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("X-WR-CALNAME:ConcursoFlow");

    expect(getEvents(ics)).toHaveLength(1);
  });

  it("usa CRLF em toda quebra de linha", () => {
    const ics = buildICalFeed([block()], subjects);
    const lines = ics.split("\r\n");
    // Se sobrar algum \n solto (não precedido por \r), o join abaixo não reconstrói o original.
    expect(lines.join("\r\n")).toBe(ics);
    expect(ics.includes("\n") && !ics.includes("\r\n")).toBe(false);
  });

  it("gera UID estável a partir do id do bloco", () => {
    const ics = buildICalFeed([block({ id: "abc-123" })], subjects);
    expect(ics).toMatch(/UID:abc-123@concursoflow\.com/);
  });

  it("monta SUMMARY com emoji + matéria + tópico quando há tópico", () => {
    const ics = buildICalFeed([block({ type: "questoes", topicName: "Controle de Constitucionalidade" })], subjects);
    const event = getFirstEvent(ics);
    expect(event.summary).toContain("Direito Constitucional");
    expect(event.summary).toContain("Controle de Constitucionalidade");
  });

  it("bloco sem tópico: SUMMARY não inclui separador de tópico vazio", () => {
    const ics = buildICalFeed([block({ topicName: null })], subjects);
    const event = getFirstEvent(ics);
    expect(event.summary).toContain("Direito Constitucional");
    expect((event.summary as string).trim().endsWith("—")).toBe(false);
  });

  it("horários corretos preservados como instantes UTC (DTSTART/DTEND)", () => {
    const ics = buildICalFeed([block({ startAt: "2026-08-01T12:00:00.000Z", endAt: "2026-08-01T13:30:00.000Z" })], subjects);
    const event = getFirstEvent(ics);
    expect(event.start.toISOString()).toBe("2026-08-01T12:00:00.000Z");
    expect(event.end?.toISOString()).toBe("2026-08-01T13:30:00.000Z");
  });

  it("virada de ano: datas em 31/12 e 01/01 são formatadas e parseadas corretamente", () => {
    const ics = buildICalFeed(
      [block({ id: "ano-1", startAt: "2026-12-31T23:00:00.000Z", endAt: "2027-01-01T00:30:00.000Z" })],
      subjects,
    );
    const event = getFirstEvent(ics);
    expect(event.start.toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(event.end?.toISOString()).toBe("2027-01-01T00:30:00.000Z");
  });

  it("escapa vírgula, ponto-e-vírgula, barra invertida e quebra de linha em SUMMARY/DESCRIPTION", () => {
    const ics = buildICalFeed(
      [
        block({
          topicName: "Art. 5º, XI; e XII",
          notes: "Linha 1\nLinha 2 com \\ barra",
        }),
      ],
      subjects,
    );
    // Cru: os separadores especiais devem vir escapados com barra invertida.
    expect(ics).toMatch(/Art\. 5º\\, XI\\; e XII/);
    // Parseado: o parser deve devolver o texto original, sem os escapes.
    const event = getFirstEvent(ics);
    expect(event.summary).toContain("Art. 5º, XI; e XII");
    expect(event.description).toContain("Linha 1\nLinha 2 com \\ barra");
  });

  it("aplica line folding em 75 octetos para DESCRIPTION longa com acentuação", () => {
    const longNotes = "Descrição bem longa com muitos acentos: é, ã, ç, õ, á — ".repeat(6);
    const ics = buildICalFeed([block({ notes: longNotes })], subjects);

    for (const rawLine of ics.split("\r\n")) {
      const byteLength = Buffer.byteLength(rawLine, "utf8");
      expect(byteLength).toBeLessThanOrEqual(75);
    }

    // Reconstrói (unfold) e confirma que o texto original sobrevive intacto.
    const event = getFirstEvent(ics);
    expect(event.description).toContain(longNotes.trim());
  });

  it("STATUS/CATEGORIES refletem o status do bloco (planned/done/skipped)", () => {
    const icsPlanned = buildICalFeed([block({ id: "p", status: "planned" })], subjects);
    const icsDone = buildICalFeed([block({ id: "d", status: "done" })], subjects);
    const icsSkipped = buildICalFeed([block({ id: "s", status: "skipped" })], subjects);

    expect(icsPlanned).toMatch(/STATUS:CONFIRMED/);
    expect(icsDone).toMatch(/STATUS:CONFIRMED/);
    expect(icsDone).toMatch(/CATEGORIES:CONCLUÍDO/i);
    expect(icsSkipped).toMatch(/STATUS:CANCELLED/);
  });

  it("inclui revisões pendentes como eventos de dia inteiro quando passadas", () => {
    const reviews: ICalReview[] = [{ id: "rev-1", subjectId: "subj-1", dueDate: "2026-08-05" }];
    const ics = buildICalFeed([], subjects, { reviews });
    const events = getEvents(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.datetype).toBe("date");
    expect(events[0]?.summary).toContain("Revisão");
    expect(events[0]?.summary).toContain("Direito Constitucional");
  });

  it("sem revisões e sem opção: nenhum evento de revisão é gerado", () => {
    const ics = buildICalFeed([], subjects);
    expect(getEvents(ics)).toHaveLength(0);
  });

  it("lista vazia produz VCALENDAR válido sem VEVENT", () => {
    const ics = buildICalFeed([], []);
    expect(() => ical.sync.parseICS(ics)).not.toThrow();
    expect(getEvents(ics)).toHaveLength(0);
  });
});

describe("filterBlocksForFeed", () => {
  const now = new Date("2026-08-15T12:00:00.000Z");

  it("mantém blocos dentro da janela de -30 a +90 dias", () => {
    const inWindow = block({ id: "in", startAt: "2026-08-20T12:00:00.000Z" });
    const filtered = filterBlocksForFeed([inWindow], now);
    expect(filtered.map((b) => b.id)).toEqual(["in"]);
  });

  it("exclui blocos antes de -30 dias", () => {
    const tooOld = block({ id: "old", startAt: "2026-07-10T12:00:00.000Z" });
    expect(filterBlocksForFeed([tooOld], now)).toHaveLength(0);
  });

  it("exclui blocos depois de +90 dias", () => {
    const tooFar = block({ id: "far", startAt: "2026-12-01T12:00:00.000Z" });
    expect(filterBlocksForFeed([tooFar], now)).toHaveLength(0);
  });

  it("inclui o limite inferior (-30 dias) e o limite superior (+90 dias)", () => {
    const lowerBound = block({ id: "lower", startAt: "2026-07-16T12:00:00.000Z" });
    const upperBound = block({ id: "upper", startAt: "2026-11-13T12:00:00.000Z" });
    const filtered = filterBlocksForFeed([lowerBound, upperBound], now);
    expect(filtered.map((b) => b.id).sort()).toEqual(["lower", "upper"]);
  });
});
