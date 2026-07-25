export type TimerStatus = "idle" | "running" | "paused";

export interface TimerState {
  subjectId: string | null;
  status: TimerStatus;
  /** Início do período "rodando" atual (null quando parado/pausado). */
  startedAt: string | null;
  /** Ms acumulados de períodos anteriores (antes do startedAt atual). */
  accumulatedMs: number;
  /** Timestamp do primeiro start desta sessão — vira Session.startedAt ao parar. */
  firstStartedAt: string | null;
}

export const IDLE_TIMER: TimerState = {
  subjectId: null,
  status: "idle",
  startedAt: null,
  accumulatedMs: 0,
  firstStartedAt: null,
};

/** Tempo decorrido calculado por timestamp — nunca por contador acumulado em memória. */
export function elapsedMs(timer: TimerState, now: Date = new Date()): number {
  if (timer.status === "running" && timer.startedAt) {
    return timer.accumulatedMs + (now.getTime() - new Date(timer.startedAt).getTime());
  }
  return timer.accumulatedMs;
}

export function startTimer(subjectId: string, now: Date = new Date()): TimerState {
  return {
    subjectId,
    status: "running",
    startedAt: now.toISOString(),
    accumulatedMs: 0,
    firstStartedAt: now.toISOString(),
  };
}

export function pauseTimer(timer: TimerState, now: Date = new Date()): TimerState {
  if (timer.status !== "running") return timer;
  return { ...timer, status: "paused", accumulatedMs: elapsedMs(timer, now), startedAt: null };
}

export function resumeTimer(timer: TimerState, now: Date = new Date()): TimerState {
  if (timer.status !== "paused") return timer;
  return { ...timer, status: "running", startedAt: now.toISOString() };
}

export function stopTimer(timer: TimerState, now: Date = new Date()): { durationMin: number; startedAt: string | null } {
  return {
    durationMin: Math.round(elapsedMs(timer, now) / 60_000),
    startedAt: timer.firstStartedAt,
  };
}

/** mm:ss abaixo de 1h, h:mm:ss a partir de 1h — usado no widget e no modo foco. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
