"use client";

import { useState } from "react";

import { ColorPicker } from "@/components/subjects/color-picker";
import { WeightPicker } from "@/components/subjects/weight-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_SUBJECT_COLOR } from "@/lib/constants";
import type { Subject } from "@/lib/data/types";

export interface SubjectFormValues {
  name: string;
  color: string;
  weight: number;
  notes: string | null;
}

interface SubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject;
  onSubmit: (values: SubjectFormValues) => void;
}

const EMPTY_VALUES: SubjectFormValues = { name: "", color: DEFAULT_SUBJECT_COLOR, weight: 3, notes: null };

export function SubjectDialog({ open, onOpenChange, subject, onSubmit }: SubjectDialogProps) {
  const [values, setValues] = useState<SubjectFormValues>(EMPTY_VALUES);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(
        subject
          ? { name: subject.name, color: subject.color, weight: subject.weight, notes: subject.notes }
          : EMPTY_VALUES,
      );
    }
  }

  const isValid = values.name.trim().length > 0;

  function handleSubmit() {
    if (!isValid) return;
    onSubmit({ ...values, name: values.name.trim(), notes: values.notes?.trim() || null });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subject ? "Editar matéria" : "Nova matéria"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-name">Nome</Label>
            <Input
              id="subject-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Ex.: Direito Constitucional"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cor</Label>
            <ColorPicker value={values.color} onChange={(color) => setValues((v) => ({ ...v, color }))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Peso</Label>
            <WeightPicker value={values.weight} onChange={(weight) => setValues((v) => ({ ...v, weight }))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-notes">Observações</Label>
            <Textarea
              id="subject-notes"
              value={values.notes ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
              placeholder="Ex.: cai muito na banca, focar em jurisprudência recente..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {subject ? "Salvar" : "Criar matéria"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
