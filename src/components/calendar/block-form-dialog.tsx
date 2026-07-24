"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import type { Block, BlockType, Subject, Topic } from "@/lib/data/types";

const BLOCK_TYPES = Object.keys(BLOCK_TYPE_LABELS) as BlockType[];

export interface BlockFormValues {
  subjectId: string;
  topicId: string | null;
  type: BlockType;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  repeatWeekly: boolean;
}

interface BlockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  topics: Topic[];
  initialDate?: Date;
  block?: Block;
  onSubmit: (values: BlockFormValues) => void;
}

function toValues(date: Date, block?: Block): BlockFormValues {
  if (block) {
    const start = new Date(block.startAt);
    const end = new Date(block.endAt);
    return {
      subjectId: block.subjectId,
      topicId: block.topicId,
      type: block.type,
      date: format(start, "yyyy-MM-dd"),
      startTime: format(start, "HH:mm"),
      endTime: format(end, "HH:mm"),
      repeatWeekly: false,
    };
  }
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  return {
    subjectId: "",
    topicId: null,
    type: "teoria",
    date: format(date, "yyyy-MM-dd"),
    startTime: format(date, "HH:mm"),
    endTime: format(end, "HH:mm"),
    repeatWeekly: false,
  };
}

const NONE_VALUE = "__none__";

export function BlockFormDialog({ open, onOpenChange, subjects, topics, initialDate, block, onSubmit }: BlockFormDialogProps) {
  const [values, setValues] = useState<BlockFormValues>(() => toValues(initialDate ?? new Date(), block));
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValues(toValues(initialDate ?? new Date(), block));
  }

  const topicsForSubject = topics.filter((topic) => topic.subjectId === values.subjectId);
  const isValid = Boolean(values.subjectId) && values.startTime < values.endTime;
  const weekdayLabel = format(new Date(`${values.date}T00:00:00`), "EEEE", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{block ? "Editar bloco" : "Novo bloco de estudo"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Matéria</Label>
            <Select
              value={values.subjectId || NONE_VALUE}
              onValueChange={(value) =>
                setValues((v) => ({ ...v, subjectId: !value || value === NONE_VALUE ? "" : value, topicId: null }))
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
              value={values.topicId ?? NONE_VALUE}
              onValueChange={(value) => setValues((v) => ({ ...v, topicId: value === NONE_VALUE ? null : value }))}
              disabled={!values.subjectId}
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
            <Select value={values.type} onValueChange={(value) => setValues((v) => ({ ...v, type: value as BlockType }))}>
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

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-date">Data</Label>
              <input
                id="block-date"
                type="date"
                value={values.date}
                onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-start">Início</Label>
              <input
                id="block-start"
                type="time"
                value={values.startTime}
                onChange={(e) => setValues((v) => ({ ...v, startTime: e.target.value }))}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-end">Fim</Label>
              <input
                id="block-end"
                type="time"
                value={values.endTime}
                onChange={(e) => setValues((v) => ({ ...v, endTime: e.target.value }))}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          {!block ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="repeat-weekly"
                checked={values.repeatWeekly}
                onCheckedChange={(checked) => setValues((v) => ({ ...v, repeatWeekly: checked === true }))}
              />
              <Label htmlFor="repeat-weekly" className="font-normal capitalize">
                Repetir toda {weekdayLabel}
              </Label>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!isValid} onClick={() => onSubmit(values)}>
            {block ? "Salvar" : "Criar bloco"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
