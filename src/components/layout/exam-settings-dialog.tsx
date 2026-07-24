"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/data/types";

interface ExamSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onSubmit: (patch: { targetExam: string | null; examDate: string | null }) => void;
}

export function ExamSettingsDialog({ open, onOpenChange, profile, onSubmit }: ExamSettingsDialogProps) {
  const [targetExam, setTargetExam] = useState(profile.targetExam ?? "");
  const [examDate, setExamDate] = useState(profile.examDate ?? "");
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTargetExam(profile.targetExam ?? "");
      setExamDate(profile.examDate ?? "");
    }
  }

  function handleSubmit() {
    onSubmit({ targetExam: targetExam.trim() || null, examDate: examDate || null });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurar prova</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exam-name">Nome do concurso</Label>
            <Input id="exam-name" value={targetExam} onChange={(e) => setTargetExam(e.target.value)} placeholder="Ex: TRT-15" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exam-date">Data da prova</Label>
            <input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
