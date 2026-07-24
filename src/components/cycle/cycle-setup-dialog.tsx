"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Cycle, CycleEntry, Subject } from "@/lib/data/types";

interface CycleSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  cycle?: Cycle;
  entries: CycleEntry[];
  onSubmit: (entries: { subjectId: string; targetMinutes: number }[]) => void;
}

export function CycleSetupDialog({ open, onOpenChange, subjects, cycle, entries, onSubmit }: CycleSetupDialogProps) {
  const [hoursBySubject, setHoursBySubject] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const nextHours: Record<string, string> = {};
      const nextSelected = new Set<string>();
      for (const subject of subjects) {
        const entry = entries.find((e) => e.subjectId === subject.id);
        if (entry) {
          nextSelected.add(subject.id);
          nextHours[subject.id] = String(entry.targetMinutes / 60);
        } else {
          nextHours[subject.id] = "5";
        }
      }
      setSelected(nextSelected);
      setHoursBySubject(nextHours);
    }
  }

  function toggleSubject(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSubmit() {
    const result = subjects
      .filter((subject) => selected.has(subject.id))
      .map((subject) => {
        const hours = Number(hoursBySubject[subject.id]);
        return { subjectId: subject.id, targetMinutes: Math.max(1, Math.round((hours || 0) * 60)) };
      });
    onSubmit(result);
    onOpenChange(false);
  }

  const isValid = selected.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cycle ? "Editar ciclo" : "Montar ciclo de estudos"}</DialogTitle>
          <DialogDescription>Escolha as matérias e a carga-horária alvo por rodada.</DialogDescription>
        </DialogHeader>

        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cadastre matérias primeiro para montar o ciclo.</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto py-1">
            {subjects.map((subject) => {
              const checked = selected.has(subject.id);
              return (
                <div key={subject.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`cycle-subject-${subject.id}`}
                    checked={checked}
                    onCheckedChange={(value) => toggleSubject(subject.id, value === true)}
                  />
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
                  <Label htmlFor={`cycle-subject-${subject.id}`} className="flex-1 font-normal">
                    {subject.name}
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      disabled={!checked}
                      value={hoursBySubject[subject.id] ?? ""}
                      onChange={(e) => setHoursBySubject((prev) => ({ ...prev, [subject.id]: e.target.value }))}
                      className="h-8 w-16"
                    />
                    <span className="text-xs text-muted-foreground">h</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Salvar ciclo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
