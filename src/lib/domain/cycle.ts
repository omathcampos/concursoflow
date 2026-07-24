export interface CycleProgressEntry {
  subjectId: string;
  weight: number;
  targetMinutes: number;
  doneMinutes: number;
}

function progressRatio(entry: CycleProgressEntry): number {
  return entry.doneMinutes / entry.targetMinutes;
}

/**
 * Sugere a próxima matéria a estudar: a com menor progresso (done/target).
 * Em empate, prioriza o maior peso. Matérias sem meta (target 0) ou já
 * concluídas (done >= target) ficam de fora.
 */
export function suggestNextSubject(entries: CycleProgressEntry[]): string | null {
  const pending = entries.filter((entry) => entry.targetMinutes > 0 && entry.doneMinutes < entry.targetMinutes);
  if (pending.length === 0) return null;

  let best = pending[0];
  let bestRatio = progressRatio(best);

  for (const entry of pending.slice(1)) {
    const ratio = progressRatio(entry);
    if (ratio < bestRatio || (ratio === bestRatio && entry.weight > best.weight)) {
      best = entry;
      bestRatio = ratio;
    }
  }

  return best.subjectId;
}

/** Verdadeiro quando o ciclo tem entradas e todas atingiram a meta. */
export function isCycleComplete(entries: CycleProgressEntry[]): boolean {
  if (entries.length === 0) return false;
  return entries.every((entry) => entry.doneMinutes >= entry.targetMinutes);
}
