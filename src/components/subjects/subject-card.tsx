"use client";

import { ChevronDown, MoreVertical, NotebookPen, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { TopicList } from "@/components/subjects/topic-list";
import { WeightPicker } from "@/components/subjects/weight-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Subject, Topic } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  subject: Subject;
  topics: Topic[];
  onEdit: () => void;
  onDelete: () => void;
  onNewAnnotation: () => void;
}

export function SubjectCard({ subject, topics, onEdit, onDelete, onNewAnnotation }: SubjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doneCount = topics.filter((t) => t.status === "done").length;
  const progress = topics.length > 0 ? Math.round((doneCount / topics.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: subject.color }}
          aria-hidden
        />
        <div className="flex-1">
          <h3 className="font-semibold leading-tight">{subject.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <WeightPicker value={subject.weight} readOnly />
            <span className="text-xs text-muted-foreground">
              {topics.length > 0 ? `${doneCount}/${topics.length} tópicos (${progress}%)` : "sem tópicos"}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Mais ações">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewAnnotation}>
              <NotebookPen className="h-4 w-4" />
              Nova anotação
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        {subject.notes ? <p className="mb-2 text-sm text-muted-foreground">{subject.notes}</p> : null}

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={expanded}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          Tópicos
        </button>

        {expanded ? (
          <div className="mt-2 border-t border-border pt-2">
            <TopicList subjectId={subject.id} topics={topics} />
          </div>
        ) : null}
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &quot;{subject.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove a matéria, seus {topics.length} tópico(s) e as entradas do ciclo vinculadas a ela. Essa
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
