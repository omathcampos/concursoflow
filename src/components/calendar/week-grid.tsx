"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { EventBlock } from "@/components/calendar/event-block";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  GRID_HEIGHT_PX,
  ROW_HEIGHT_PX,
  heightForDuration,
  pixelsToSlotMinutes,
  slotFromOffset,
  topForDate,
  weekDays,
} from "@/lib/calendar";
import type { Block, Review, Subject } from "@/lib/data/types";
import { cn } from "@/lib/utils";

// +1 pra incluir o rótulo final (24:00/meia-noite) — sem ele, a grade
// parecia parar às 23:00 mesmo tendo mais uma hora de linhas abaixo.
const HOUR_MARKS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

interface WeekGridProps {
  weekStart: Date;
  blocks: Block[];
  reviews: Review[];
  subjectsById: Map<string, Subject>;
  onCreateAt: (date: Date) => void;
  onOpenBlock: (block: Block) => void;
  onMoveBlock: (block: Block, nextStartAt: Date, nextEndAt: Date) => void;
  onResizeBlock: (block: Block, nextEndAt: Date) => void;
  onCompleteReview: (review: Review) => void;
  onSkipReview: (review: Review) => void;
}

export function WeekGrid({
  weekStart,
  blocks,
  reviews,
  subjectsById,
  onCreateAt,
  onOpenBlock,
  onMoveBlock,
  onResizeBlock,
  onCompleteReview,
  onSkipReview,
}: WeekGridProps) {
  const days = weekDays(weekStart);
  const gridRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const idStr = String(event.active.id);
    const isResize = idStr.startsWith("resize:");
    const blockId = isResize ? idStr.slice("resize:".length) : idStr;
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const columnWidth = (gridRef.current?.offsetWidth ?? 700 * 7) / 7;
    const start = new Date(block.startAt);
    const end = new Date(block.endAt);

    if (isResize) {
      const deltaMinutes = pixelsToSlotMinutes(event.delta.y);
      const durationMin = Math.max(30, (end.getTime() - start.getTime()) / 60_000 + deltaMinutes);
      onResizeBlock(block, new Date(start.getTime() + durationMin * 60_000));
      return;
    }

    const dayOffset = Math.round(event.delta.x / columnWidth);
    const minuteOffset = pixelsToSlotMinutes(event.delta.y);
    const shiftMs = dayOffset * 86_400_000 + minuteOffset * 60_000;
    onMoveBlock(block, new Date(start.getTime() + shiftMs), new Date(end.getTime() + shiftMs));
  }

  function handleColumnClick(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const { hours, minutes } = slotFromOffset(e.clientY - rect.top);
    const date = new Date(day);
    date.setHours(hours, minutes, 0, 0);
    onCreateAt(date);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex overflow-hidden rounded-xl border border-border">
        <div className="w-14 shrink-0 border-r border-border bg-card">
          <div className="h-12 border-b border-border" />
          <div style={{ height: GRID_HEIGHT_PX }} className="relative">
            {HOUR_MARKS.map((hour) => (
              <div
                key={hour}
                style={{ top: (hour - DAY_START_HOUR) * 2 * ROW_HEIGHT_PX }}
                className="absolute right-1.5 -translate-y-1/2 text-[11px] text-muted-foreground"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        <div ref={gridRef} className="grid flex-1 grid-cols-7">
          {days.map((day) => {
            const isToday = isSameDay(day, now);
            const dayBlocks = blocks.filter((block) => isSameDay(new Date(block.startAt), day));
            const dayReviews = reviews.filter((review) => review.status === "pending" && isSameDay(new Date(`${review.dueDate}T00:00:00`), day));

            return (
              <div key={day.toISOString()} className="border-r border-border last:border-r-0">
                <div
                  className={cn(
                    "flex h-12 flex-col items-center justify-center border-b border-border text-sm",
                    isToday && "bg-primary/5 font-semibold text-primary",
                  )}
                >
                  <span className="capitalize">{format(day, "EEE", { locale: ptBR })}</span>
                  <span className="text-xs text-muted-foreground">{format(day, "dd/MM")}</span>
                </div>

                {dayReviews.length > 0 ? (
                  <div
                    data-testid={`review-strip-${format(day, "yyyy-MM-dd")}`}
                    className="flex flex-wrap gap-1 border-b border-border bg-muted/30 p-1.5"
                  >
                    {dayReviews.map((review) => {
                      const subject = subjectsById.get(review.subjectId);
                      if (!subject) return null;
                      return (
                        <span
                          key={review.id}
                          className="flex items-center gap-1 rounded-full border border-border bg-background py-0.5 pl-2 pr-1 text-[11px]"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden />
                          <button
                            type="button"
                            onClick={() => onCompleteReview(review)}
                            className="max-w-20 truncate text-left hover:underline"
                            title={`Revisar ${subject.name}`}
                          >
                            {subject.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSkipReview(review)}
                            aria-label={`Pular revisão de ${subject.name}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                <div
                  onClick={(e) => handleColumnClick(day, e)}
                  className="relative cursor-pointer"
                  data-testid={`calendar-column-${format(day, "yyyy-MM-dd")}`}
                  style={{
                    height: GRID_HEIGHT_PX,
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent calc(${2 * ROW_HEIGHT_PX}px - 1px), var(--color-border) calc(${2 * ROW_HEIGHT_PX}px - 1px), var(--color-border) calc(${2 * ROW_HEIGHT_PX}px))`,
                  }}
                >
                  {isToday ? (
                    <div
                      style={{ top: topForDate(now) }}
                      className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-destructive"
                    >
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                    </div>
                  ) : null}

                  {dayBlocks.map((block) => {
                    const subject = subjectsById.get(block.subjectId);
                    if (!subject) return null;
                    return (
                      <EventBlock
                        key={block.id}
                        block={block}
                        subject={subject}
                        top={topForDate(new Date(block.startAt))}
                        height={heightForDuration((new Date(block.endAt).getTime() - new Date(block.startAt).getTime()) / 60_000)}
                        interactive
                        onOpen={() => onOpenBlock(block)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
