export interface LayoutItem {
  id: string;
  startAt: string;
  endAt: string;
}

export interface LayoutPosition {
  id: string;
  /** índice da coluna (0-based) dentro do seu cluster de sobreposição. */
  column: number;
  /** total de colunas do cluster — largura de cada item = 100% / columnCount. */
  columnCount: number;
}

interface ActiveItem {
  id: string;
  endMs: number;
  column: number;
}

/**
 * Particiona itens do mesmo dia (blocos + sessões avulsas) em colunas
 * lado a lado quando se sobrepõem no tempo — mesma regra de "toque nas
 * bordas não conta" do detectOverlap. Itens sem sobreposição com ninguém
 * ocupam a largura inteira (columnCount 1).
 */
export function layoutDayItems(items: LayoutItem[]): LayoutPosition[] {
  const sorted = [...items].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime() || a.id.localeCompare(b.id));

  const result: LayoutPosition[] = [];
  let active: ActiveItem[] = [];
  const columnOf = new Map<string, number>();
  let cluster: string[] = [];
  let clusterMaxColumns = 0;

  function flushCluster() {
    for (const id of cluster) {
      result.push({ id, column: columnOf.get(id)!, columnCount: clusterMaxColumns });
    }
    cluster = [];
    clusterMaxColumns = 0;
  }

  for (const item of sorted) {
    const startMs = new Date(item.startAt).getTime();
    const endMs = new Date(item.endAt).getTime();

    const stillActive = active.filter((a) => a.endMs > startMs);
    if (stillActive.length === 0 && active.length > 0) {
      flushCluster();
    }
    active = stillActive;

    const usedColumns = new Set(active.map((a) => a.column));
    let column = 0;
    while (usedColumns.has(column)) column++;

    active.push({ id: item.id, endMs, column });
    columnOf.set(item.id, column);
    cluster.push(item.id);
    clusterMaxColumns = Math.max(clusterMaxColumns, column + 1);
  }
  flushCluster();

  return result;
}
