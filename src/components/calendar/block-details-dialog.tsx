"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, NotebookPen, Pencil, SkipForward, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import type { DeleteScope } from "@/lib/data/repository";
import type { Block, Subject, Topic } from "@/lib/data/types";

interface BlockDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block;
  subject: Subject;
  topic?: Topic;
  hasLinkedSession: boolean;
  onEdit: () => void;
  onMarkStatus: (status: "skipped" | "planned") => void;
  onCompleteWithSession: () => void;
  onDelete: (scope: DeleteScope) => void;
  onNewAnnotation: () => void;
}

export function BlockDetailsDialog({
  open,
  onOpenChange,
  block,
  subject,
  topic,
  hasLinkedSession,
  onEdit,
  onMarkStatus,
  onCompleteWithSession,
  onDelete,
  onNewAnnotation,
}: BlockDetailsDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isRecurring = Boolean(block.recurrenceRule);

  function handleDelete(scope: DeleteScope) {
    onDelete(scope);
    setConfirmDelete(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open && !confirmDelete} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
              {subject.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{BLOCK_TYPE_LABELS[block.type]}</Badge>
              {block.status === "done" ? (
                <Badge variant="secondary">
                  <Check className="h-3 w-3" /> Concluído
                </Badge>
              ) : null}
              {block.status === "skipped" ? <Badge variant="secondary">Pulado</Badge> : null}
            </div>
            {topic ? <p className="text-muted-foreground">Tópico: {topic.name}</p> : null}
            <p className="text-muted-foreground">
              {format(new Date(block.startAt), "EEEE, dd/MM · HH:mm", { locale: ptBR })}–
              {format(new Date(block.endAt), "HH:mm", { locale: ptBR })}
            </p>
            {block.notes ? <p className="text-muted-foreground">{block.notes}</p> : null}
            {hasLinkedSession ? <p className="text-muted-foreground">Sessão registrada para este bloco.</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => (block.status === "done" ? onMarkStatus("planned") : onCompleteWithSession())}
            >
              <Check className="h-3.5 w-3.5" />
              {block.status === "done" ? "Desfazer" : "Concluído"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMarkStatus(block.status === "skipped" ? "planned" : "skipped")}>
              <SkipForward className="h-3.5 w-3.5" />
              {block.status === "skipped" ? "Desfazer" : "Pular"}
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={onNewAnnotation}>
              <NotebookPen className="h-3.5 w-3.5" />
              Anotação
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
            <AlertDialogDescription>
              {isRecurring
                ? "Este bloco faz parte de uma série recorrente. Excluir só esta ocorrência ou esta e todas as futuras?"
                : "Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {isRecurring ? (
              <>
                <Button variant="outline" onClick={() => handleDelete("this")}>
                  Só esta
                </Button>
                <AlertDialogAction onClick={() => handleDelete("future")}>Esta e as futuras</AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => handleDelete("this")}>Excluir</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
