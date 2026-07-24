"use client";

import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import type { Block, Subject } from "@/lib/data/types";

interface MobileAgendaProps {
  day: Date;
  blocks: Block[];
  subjectsById: Map<string, Subject>;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onCreate: () => void;
  onOpenBlock: (block: Block) => void;
}

export function MobileAgenda({
  day,
  blocks,
  subjectsById,
  onPrevDay,
  onNextDay,
  onToday,
  onCreate,
  onOpenBlock,
}: MobileAgendaProps) {
  const dayBlocks = blocks
    .filter((block) => isSameDay(new Date(block.startAt), day))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const isToday = isSameDay(day, new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onPrevDay} aria-label="Dia anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button type="button" onClick={onToday} className="flex flex-col items-center">
          <span className="flex items-center gap-1.5 text-sm font-semibold capitalize">
            {format(day, "EEEE", { locale: ptBR })}
            {isToday ? (
              <Badge variant="secondary" className="text-[10px]">
                Hoje
              </Badge>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">{format(day, "dd/MM/yyyy")}</span>
        </button>
        <Button variant="ghost" size="icon" onClick={onNextDay} aria-label="Próximo dia">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button onClick={onCreate} className="self-start">
        <Plus className="h-4 w-4" />
        Novo bloco
      </Button>

      <div className="flex flex-col gap-2">
        {dayBlocks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum bloco neste dia.</p>
        ) : (
          dayBlocks.map((block) => {
            const subject = subjectsById.get(block.subjectId);
            if (!subject) return null;
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => onOpenBlock(block)}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left"
              >
                <span className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{subject.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(block.startAt), "HH:mm")}–{format(new Date(block.endAt), "HH:mm")} ·{" "}
                    {BLOCK_TYPE_LABELS[block.type]}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
