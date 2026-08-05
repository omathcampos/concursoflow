/**
 * Auto-scroll inteligente da grade 24h: ao abrir, rola pra ~1h antes do
 * primeiro bloco do dia OU pra hora atual, o que for MENOR — nunca abre
 * mostrando madrugada vazia quando há algo relevante mais tarde, mas também
 * nunca esconde o "agora" quando ele já é cedo o bastante.
 */
export function computeAutoScrollHour(blockStartHours: number[], nowHour: number): number {
  const clampedNow = Math.max(0, Math.min(23, nowHour));
  if (blockStartHours.length === 0) return clampedNow;

  const earliestBlockHour = Math.min(...blockStartHours);
  const oneHourBeforeFirstBlock = Math.max(0, earliestBlockHour - 1);
  return Math.min(oneHourBeforeFirstBlock, clampedNow);
}
