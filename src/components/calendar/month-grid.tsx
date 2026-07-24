"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek as dfStartOfWeek,
} from "date-fns";

import { WEEKDAY_LABELS } from "@/lib/calendar";
import type { Block, Subject } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface MonthGridProps {
  month: Date;
  blocks: Block[];
  subjectsById: Map<string, Subject>;
  onSelectDay: (day: Date) => void;
}

export function MonthGrid({ month, blocks, subjectsById, onSelectDay }: MonthGridProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = dfStartOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-card">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayBlocks = blocks.filter((block) => isSameDay(new Date(block.startAt), day));
          const subjectIds = Array.from(new Set(dayBlocks.map((block) => block.subjectId)));
          const totalMinutes = dayBlocks.reduce(
            (sum, block) => sum + (new Date(block.endAt).getTime() - new Date(block.startAt).getTime()) / 60_000,
            0,
          );
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-24 flex-col items-start gap-1.5 border-r border-b border-border p-2 text-left last:border-r-0 hover:bg-muted/50",
                !inMonth && "text-muted-foreground/40",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              {subjectIds.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {subjectIds.slice(0, 4).map((id) => (
                    <span
                      key={id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: subjectsById.get(id)?.color }}
                    />
                  ))}
                  {subjectIds.length > 4 ? (
                    <span className="text-[10px] text-muted-foreground">+{subjectIds.length - 4}</span>
                  ) : null}
                </div>
              ) : null}
              {totalMinutes > 0 ? (
                <span className="text-[10px] text-muted-foreground">{(totalMinutes / 60).toFixed(1)}h</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
