"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import type { Session, Subject, Topic } from "@/lib/data/types";

interface SessionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  subject: Subject;
  topic?: Topic;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Detalhes de uma sessão AVULSA (sem block_id) clicada na grade do
 * calendário — mesmo papel do BlockDetailsDialog, mas pro que já foi
 * realizado (registro manual/cronômetro), não pro que está planejado.
 */
export function SessionDetailsDialog({ open, onOpenChange, session, subject, topic, onEdit, onDelete }: SessionDetailsDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    onDelete();
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
              <Badge variant="secondary">{BLOCK_TYPE_LABELS[session.type]}</Badge>
              <Badge variant="secondary">Sessão realizada</Badge>
            </div>
            {topic ? <p className="text-muted-foreground">Tópico: {topic.name}</p> : null}
            <p className="text-muted-foreground">
              {format(new Date(session.startedAt), "EEEE, dd/MM · HH:mm", { locale: ptBR })} · {session.durationMin} min
            </p>
            {session.questionsTotal != null ? (
              <p className="text-muted-foreground">
                {session.questionsCorrect ?? 0}/{session.questionsTotal} questões
              </p>
            ) : null}
            {session.notes ? <p className="text-muted-foreground">{session.notes}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
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
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
