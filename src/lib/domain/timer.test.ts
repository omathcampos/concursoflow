import { describe, expect, it } from "vitest";

import { elapsedMs, formatElapsed, IDLE_TIMER, pauseTimer, resumeTimer, startTimer, stopTimer } from "@/lib/domain/timer";

describe("timer", () => {
  it("timer ocioso tem elapsed 0", () => {
    expect(elapsedMs(IDLE_TIMER)).toBe(0);
  });

  it("start seguido de elapsed calcula pelo timestamp, não por contador", () => {
    const t0 = new Date("2026-03-02T10:00:00.000Z");
    const timer = startTimer("subj-1", t0);
    expect(timer.status).toBe("running");

    const t1 = new Date(t0.getTime() + 5_000);
    expect(elapsedMs(timer, t1)).toBe(5_000);
  });

  it("pause congela o tempo decorrido", () => {
    const t0 = new Date("2026-03-02T10:00:00.000Z");
    const running = startTimer("subj-1", t0);

    const t1 = new Date(t0.getTime() + 5_000);
    const paused = pauseTimer(running, t1);
    expect(paused.status).toBe("paused");
    expect(elapsedMs(paused)).toBe(5_000);

    // Mesmo "passando o tempo" sem retomar, o valor não muda.
    const t2 = new Date(t1.getTime() + 60_000);
    expect(elapsedMs(paused, t2)).toBe(5_000);
  });

  it("resume soma o tempo decorrido antes da pausa ao novo período rodando", () => {
    const t0 = new Date("2026-03-02T10:00:00.000Z");
    let timer = startTimer("subj-1", t0);
    timer = pauseTimer(timer, new Date(t0.getTime() + 5_000));
    timer = resumeTimer(timer, new Date(t0.getTime() + 10_000));

    const t3 = new Date(t0.getTime() + 13_000);
    expect(elapsedMs(timer, t3)).toBe(5_000 + 3_000);
  });

  it("sobrevive a 'refresh': recalcular elapsed a partir do mesmo estado persistido dá o mesmo resultado", () => {
    const t0 = new Date("2026-03-02T10:00:00.000Z");
    const timer = startTimer("subj-1", t0);
    const serialized = JSON.parse(JSON.stringify(timer));

    const later = new Date(t0.getTime() + 42_000);
    expect(elapsedMs(serialized, later)).toBe(42_000);
  });

  it("stop retorna a duração em minutos arredondada", () => {
    const t0 = new Date("2026-03-02T10:00:00.000Z");
    const timer = startTimer("subj-1", t0);
    const t1 = new Date(t0.getTime() + 90_000); // 1.5min
    expect(stopTimer(timer, t1).durationMin).toBe(2);
  });

  it("stop de um timer pausado usa o tempo acumulado (não continua contando)", () => {
    const t0 = new Date("2026-03-02T10:00:00.000Z");
    let timer = startTimer("subj-1", t0);
    timer = pauseTimer(timer, new Date(t0.getTime() + 120_000)); // 2min
    const muchLater = new Date(t0.getTime() + 999_000);
    expect(stopTimer(timer, muchLater).durationMin).toBe(2);
  });

  it("pause em timer que não está rodando (idle) não tem efeito", () => {
    expect(pauseTimer(IDLE_TIMER)).toBe(IDLE_TIMER);
  });

  it("resume em timer que não está pausado (idle) não tem efeito", () => {
    expect(resumeTimer(IDLE_TIMER)).toBe(IDLE_TIMER);
  });
});

describe("formatElapsed", () => {
  it("formata segundos e minutos como mm:ss abaixo de 1 hora", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(5_000)).toBe("00:05");
    expect(formatElapsed(90_000)).toBe("01:30");
    expect(formatElapsed(3_599_000)).toBe("59:59");
  });

  it("inclui horas como h:mm:ss a partir de 1 hora", () => {
    expect(formatElapsed(3_600_000)).toBe("1:00:00");
    expect(formatElapsed(3_661_000)).toBe("1:01:01");
    expect(formatElapsed(7_325_000)).toBe("2:02:05");
  });

  it("trunca milissegundos parciais (não arredonda pra cima)", () => {
    expect(formatElapsed(1_999)).toBe("00:01");
  });
});
