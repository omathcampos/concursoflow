"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { CycleEntry, Subject } from "@/lib/data/types";

export function SubjectProgressRow({
  subject,
  entry,
  onAddProgress,
}: {
  subject: Subject;
  entry: CycleEntry;
  onAddProgress: () => void;
}) {
  const percent = entry.targetMinutes > 0 ? Math.min(100, Math.round((entry.doneMinutes / entry.targetMinutes) * 100)) : 0;
  const doneHours = (entry.doneMinutes / 60).toFixed(1);
  const targetHours = (entry.targetMinutes / 60).toFixed(1);

  return (
    <div className="flex items-center gap-3">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden />
      <span className="w-36 shrink-0 truncate text-sm font-medium">{subject.name}</span>
      <Progress value={percent} className="h-2 flex-1" />
      <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
        {doneHours}h / {targetHours}h
      </span>
      <Button variant="outline" size="sm" onClick={onAddProgress} title="Simular 30min de estudo (temporário até a Fase 4)">
        <Plus className="h-3.5 w-3.5" />
        30min
      </Button>
    </div>
  );
}
