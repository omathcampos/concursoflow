"use client";

import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import { sessionFormSchema, type SessionFormData } from "@/lib/domain/session-validation";
import type { BlockType, Subject, Topic } from "@/lib/data/types";

const BLOCK_TYPES = Object.keys(BLOCK_TYPE_LABELS) as BlockType[];
const NONE_VALUE = "__none__";

export interface SessionFormInitial {
  subjectId?: string;
  topicId?: string | null;
  type?: BlockType;
  startedAt?: string; // ISO
  durationMin?: number;
  questionsTotal?: number | null;
  questionsCorrect?: number | null;
  pagesRead?: number | null;
  notes?: string | null;
  scheduleReview?: boolean;
}

interface FormFields {
  subjectId: string;
  topicId: string | null;
  type: BlockType;
  startedAtLocal: string; // yyyy-MM-ddTHH:mm
  durationMin: string;
  questionsTotal: string;
  questionsCorrect: string;
  pagesRead: string;
  notes: string;
  scheduleReview: boolean;
}

function toLocalInput(iso?: string): string {
  return format(iso ? new Date(iso) : new Date(), "yyyy-MM-dd'T'HH:mm");
}

function toFields(initial?: SessionFormInitial): FormFields {
  const type = initial?.type ?? "teoria";
  return {
    subjectId: initial?.subjectId ?? "",
    topicId: initial?.topicId ?? null,
    type,
    startedAtLocal: toLocalInput(initial?.startedAt),
    durationMin: initial?.durationMin != null ? String(initial.durationMin) : "60",
    questionsTotal: initial?.questionsTotal != null ? String(initial.questionsTotal) : "",
    questionsCorrect: initial?.questionsCorrect != null ? String(initial.questionsCorrect) : "",
    pagesRead: initial?.pagesRead != null ? String(initial.pagesRead) : "",
    notes: initial?.notes ?? "",
    scheduleReview: initial?.scheduleReview ?? (type === "teoria" || type === "aula"),
  };
}

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  topics: Topic[];
  title?: string;
  initial?: SessionFormInitial;
  onSubmit: (data: SessionFormData) => void;
}

export function SessionFormDialog({
  open,
  onOpenChange,
  subjects,
  topics,
  title = "Nova sessão",
  initial,
  onSubmit,
}: SessionFormDialogProps) {
  const [fields, setFields] = useState<FormFields>(() => toFields(initial));
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFields(toFields(initial));
      setError(null);
    }
  }

  const topicsForSubject = topics.filter((topic) => topic.subjectId === fields.subjectId);

  const total = Number(fields.questionsTotal);
  const correct = Number(fields.questionsCorrect);
  const accuracy = fields.questionsTotal && total > 0 ? Math.round((correct / total) * 100) : null;

  function handleSubmit() {
    const parsed = sessionFormSchema.safeParse({
      subjectId: fields.subjectId,
      topicId: fields.topicId,
      type: fields.type,
      startedAt: new Date(fields.startedAtLocal).toISOString(),
      durationMin: fields.durationMin,
      questionsTotal: fields.questionsTotal === "" ? null : fields.questionsTotal,
      questionsCorrect: fields.questionsCorrect === "" ? null : fields.questionsCorrect,
      pagesRead: fields.pagesRead === "" ? null : fields.pagesRead,
      notes: fields.notes.trim() || null,
      scheduleReview: fields.scheduleReview,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Matéria</Label>
            <Select
              value={fields.subjectId || NONE_VALUE}
              onValueChange={(value) =>
                setFields((f) => ({ ...f, subjectId: !value || value === NONE_VALUE ? "" : value, topicId: null }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma matéria">
                  {(value: string) =>
                    value === NONE_VALUE ? "Selecione uma matéria" : (subjects.find((s) => s.id === value)?.name ?? "Selecione uma matéria")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tópico (opcional)</Label>
            <Select
              value={fields.topicId ?? NONE_VALUE}
              onValueChange={(value) => setFields((f) => ({ ...f, topicId: value === NONE_VALUE ? null : value }))}
              disabled={!fields.subjectId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sem tópico">
                  {(value: string) =>
                    value === NONE_VALUE ? "Sem tópico" : (topicsForSubject.find((t) => t.id === value)?.name ?? "Sem tópico")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sem tópico</SelectItem>
                {topicsForSubject.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={fields.type} onValueChange={(value) => setFields((f) => ({ ...f, type: value as BlockType }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo">{(value: string) => BLOCK_TYPE_LABELS[value as BlockType]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {BLOCK_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-started-at">Início</Label>
              <input
                id="session-started-at"
                type="datetime-local"
                value={fields.startedAtLocal}
                onChange={(e) => setFields((f) => ({ ...f, startedAtLocal: e.target.value }))}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-duration">Duração (min)</Label>
              <Input
                id="session-duration"
                type="number"
                min={1}
                value={fields.durationMin}
                onChange={(e) => setFields((f) => ({ ...f, durationMin: e.target.value }))}
              />
            </div>
          </div>

          {fields.type === "questoes" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="session-questions-total">Questões feitas</Label>
                <Input
                  id="session-questions-total"
                  type="number"
                  min={0}
                  value={fields.questionsTotal}
                  onChange={(e) => setFields((f) => ({ ...f, questionsTotal: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="session-questions-correct">
                  Acertos {accuracy !== null ? <span className="text-muted-foreground">({accuracy}%)</span> : null}
                </Label>
                <Input
                  id="session-questions-correct"
                  type="number"
                  min={0}
                  value={fields.questionsCorrect}
                  onChange={(e) => setFields((f) => ({ ...f, questionsCorrect: e.target.value }))}
                />
              </div>
            </div>
          ) : null}

          {fields.type === "teoria" || fields.type === "aula" || fields.type === "lei_seca" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-pages">Páginas lidas (opcional)</Label>
              <Input
                id="session-pages"
                type="number"
                min={0}
                value={fields.pagesRead}
                onChange={(e) => setFields((f) => ({ ...f, pagesRead: e.target.value }))}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-notes">Comentário (opcional)</Label>
            <Textarea
              id="session-notes"
              value={fields.notes}
              onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="session-schedule-review"
              checked={fields.scheduleReview}
              onCheckedChange={(checked) => setFields((f) => ({ ...f, scheduleReview: checked === true }))}
            />
            <Label htmlFor="session-schedule-review" className="font-normal">
              Agendar revisões espaçadas
            </Label>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
