"use client";

import { useDraggable } from "@dnd-kit/core";
import { Check } from "lucide-react";

import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import type { Block, Subject } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface EventBlockProps {
  block: Block;
  subject: Subject;
  top: number;
  height: number;
  interactive: boolean;
  onOpen: () => void;
}

export function EventBlock({ block, subject, top, height, interactive, onOpen }: EventBlockProps) {
  const {
    setNodeRef: setMoveRef,
    listeners: moveListeners,
    attributes: moveAttributes,
    transform,
    isDragging: isMoving,
  } = useDraggable({ id: block.id, disabled: !interactive });
  const {
    setNodeRef: setResizeRef,
    listeners: resizeListeners,
    attributes: resizeAttributes,
    isDragging: isResizing,
  } = useDraggable({ id: `resize:${block.id}`, disabled: !interactive });

  const style: React.CSSProperties = {
    top,
    height: Math.max(height, 20),
    backgroundColor: subject.color,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isMoving || isResizing ? 30 : undefined,
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
      className={cn(
        "absolute inset-x-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-white shadow-sm outline-none",
        interactive && "cursor-grab touch-none active:cursor-grabbing",
        isMoving && "opacity-40",
        block.status === "done" && "opacity-55",
        block.status === "skipped" && "opacity-45 line-through decoration-2",
      )}
    >
      <p className="flex items-center gap-1 truncate font-medium">
        {block.status === "done" ? <Check className="h-3 w-3 shrink-0" /> : null}
        {subject.name}
      </p>
      {height >= 34 ? <p className="truncate opacity-90">{BLOCK_TYPE_LABELS[block.type]}</p> : null}
      {interactive ? (
        <div
          ref={setResizeRef}
          {...resizeListeners}
          {...resizeAttributes}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
        />
      ) : null}
    </div>
  );
}
