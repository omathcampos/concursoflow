"use client";

import { useDraggable } from "@dnd-kit/core";
import { Check } from "lucide-react";

import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import type { Session, Subject } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface SessionBlockProps {
  session: Session;
  subject: Subject;
  top: number;
  height: number;
  /** posição/largura dentro do cluster de sobreposição (layoutDayItems) — 100%/columnCount, deslocado por column. */
  column: number;
  columnCount: number;
  onOpen: () => void;
}

/**
 * Sessão avulsa (sem block_id) na grade — visual deliberadamente distinto do
 * EventBlock (bloco planejado): preenchimento translúcido + borda tracejada
 * + ícone de check, pra nunca confundir "planejado" com "já realizado".
 * Arrastável/redimensionável como um bloco, mas SEM detectOverlap (não é
 * planejamento) e com ids prefixados (`session:`/`session-resize:`) pro
 * WeekGrid distinguir do fluxo de blocos no handleDragEnd.
 */
export function SessionBlock({ session, subject, top, height, column, columnCount, onOpen }: SessionBlockProps) {
  const { setNodeRef: setMoveRef, listeners: moveListeners, attributes: moveAttributes, transform, isDragging: isMoving } = useDraggable({
    id: `session:${session.id}`,
  });
  const { setNodeRef: setResizeRef, listeners: resizeListeners, attributes: resizeAttributes, isDragging: isResizing } = useDraggable({
    id: `session-resize:${session.id}`,
  });

  const widthPct = 100 / columnCount;
  const style: React.CSSProperties = {
    top,
    height: Math.max(height, 20),
    left: `calc(${column * widthPct}% + 1px)`,
    width: `calc(${widthPct}% - 2px)`,
    backgroundColor: subject.color,
    opacity: isMoving ? 0.4 : 0.6,
    borderColor: subject.color,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isMoving || isResizing ? 30 : 20,
  };

  return (
    <div
      ref={setMoveRef}
      style={style}
      {...moveListeners}
      {...moveAttributes}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      role="button"
      aria-label={`${subject.name} (sessão realizada)`}
      className={cn(
        "absolute overflow-hidden rounded-md border-2 border-dashed px-1.5 py-0.5 text-left text-[11px] leading-tight text-white shadow-sm outline-none",
        "cursor-grab touch-none active:cursor-grabbing",
      )}
    >
      <p className="flex items-center gap-1 truncate font-medium">
        <Check className="h-3 w-3 shrink-0" />
        {subject.name}
      </p>
      {height >= 34 ? <p className="truncate opacity-90">{BLOCK_TYPE_LABELS[session.type]}</p> : null}
      <div
        ref={setResizeRef}
        {...resizeListeners}
        {...resizeAttributes}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
      />
    </div>
  );
}
