"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/data/types";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onSubmit: (patch: { displayName: string | null; targetExam: string | null; examDate: string | null }) => void;
}

export function ProfileDialog({ open, onOpenChange, profile, onSubmit }: ProfileDialogProps) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [targetExam, setTargetExam] = useState(profile.targetExam ?? "");
  const [examDate, setExamDate] = useState(profile.examDate ?? "");
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDisplayName(profile.displayName ?? "");
      setTargetExam(profile.targetExam ?? "");
      setExamDate(profile.examDate ?? "");
    }
  }

  function handleSubmit() {
    onSubmit({ displayName: displayName.trim() || null, targetExam: targetExam.trim() || null, examDate: examDate || null });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Nome de exibição</Label>
            <Input id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Como podemos te chamar?" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exam-name">Concurso-alvo</Label>
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
