export interface OverlapCandidate {
  id?: string;
  startAt: string;
  endAt: string;
}

/** Verdadeiro se `candidate` sobrepõe algum bloco existente (toque nas bordas não conta). */
export function detectOverlap(blocks: OverlapCandidate[], candidate: OverlapCandidate): boolean {
  const start = new Date(candidate.startAt).getTime();
  const end = new Date(candidate.endAt).getTime();

  return blocks.some((block) => {
    if (candidate.id && block.id === candidate.id) return false;
    const blockStart = new Date(block.startAt).getTime();
    const blockEnd = new Date(block.endAt).getTime();
    return start < blockEnd && blockStart < end;
  });
}

export interface WeeklyOccurrence {
  startAt: string;
  endAt: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Gera `count` ocorrências semanais a partir de startAt, preservando a duração. */
export function generateWeeklyOccurrences(startAt: string, endAt: string, count: number): WeeklyOccurrence[] {
  const start = new Date(startAt).getTime();
  const durationMs = new Date(endAt).getTime() - start;

  return Array.from({ length: count }, (_, index) => {
    const occurrenceStart = new Date(start + index * WEEK_MS);
    const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
    return { startAt: occurrenceStart.toISOString(), endAt: occurrenceEnd.toISOString() };
  });
}
