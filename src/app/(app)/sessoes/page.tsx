"use client";

import { format, isSameDay, isSameMonth, isSameWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SessionFormInitial } from "@/components/sessions/session-form-dialog";
import { SessionFormDialog } from "@/components/sessions/session-form-dialog";
import { BLOCK_TYPE_LABELS } from "@/lib/calendar";
import type { SessionFormData } from "@/lib/domain/session-validation";
import type { Session } from "@/lib/data/types";
import { useRepo } from "@/lib/data/use-repo";

type Period = "all" | "today" | "week" | "month";

export default function SessoesPage() {
  const repo = useRepo();
  const subjects = repo.subjects.list();
  const topics = repo.topics.list();
  const sessions = repo.sessions.list();

  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<Period>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editingSession = editingId ? sessions.find((s) => s.id === editingId) : undefined;

  const filtered = sessions.filter((session) => {
    if (subjectFilter !== "all" && session.subjectId !== subjectFilter) return false;
    if (typeFilter !== "all" && session.type !== typeFilter) return false;
    const date = new Date(session.startedAt);
    const now = new Date();
    if (periodFilter === "today" && !isToday(date)) return false;
    if (periodFilter === "week" && !isSameWeek(date, now, { weekStartsOn: 1 })) return false;
    if (periodFilter === "month" && !isSameMonth(date, now)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const groups: { day: Date; sessions: Session[] }[] = [];
  for (const session of sorted) {
    const day = new Date(session.startedAt);
    const group = groups.find((g) => isSameDay(g.day, day));
    if (group) group.sessions.push(session);
    else groups.push({ day, sessions: [session] });
  }

  function handleCreate(data: SessionFormData) {
    const cycle = repo.cycle.getActive();
    const inCycle = cycle && repo.cycle.entries(cycle.id).some((e) => e.subjectId === data.subjectId);
    repo.sessions.create({
      ...data,
      blockId: null,
      cycleId: inCycle ? cycle!.id : null,
      cycleRound: inCycle ? cycle!.round : null,
    });
    setCreateOpen(false);
  }

  function handleEdit(data: SessionFormData) {
    if (!editingSession) return;
    repo.sessions.update(editingSession.id, data);
    setEditingId(null);
  }

  function handleDelete() {
    if (!deletingId) return;
    repo.sessions.remove(deletingId);
    setDeletingId(null);
  }

  const editingInitial: SessionFormInitial | undefined = editingSession
    ? {
        subjectId: editingSession.subjectId,
        topicId: editingSession.topicId,
        type: editingSession.type,
        startedAt: editingSession.startedAt,
        durationMin: editingSession.durationMin,
        questionsTotal: editingSession.questionsTotal,
        questionsCorrect: editingSession.questionsCorrect,
        pagesRead: editingSession.pagesRead,
        notes: editingSession.notes,
        scheduleReview: editingSession.scheduleReview,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessões</h1>
          <p className="mt-1 text-muted-foreground">Registre o que você estudou.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={subjects.length === 0}>
          <Plus className="h-4 w-4" />
          Nova sessão
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={subjectFilter} onValueChange={(value) => setSubjectFilter(value ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas as matérias">
              {(value: string) =>
                value === "all" ? "Todas as matérias" : (subjects.find((s) => s.id === value)?.name ?? "Todas as matérias")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as matérias</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos os tipos">
              {(value: string) => (value === "all" ? "Todos os tipos" : BLOCK_TYPE_LABELS[value as keyof typeof BLOCK_TYPE_LABELS])}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={(value) => setPeriodFilter((value ?? "all") as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todo o período">
              {(value: string) =>
                ({ all: "Todo o período", today: "Hoje", week: "Esta semana", month: "Este mês" })[value] ?? "Todo o período"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma sessão encontrada</CardTitle>
            <CardDescription>
              {subjects.length === 0
                ? "Cadastre matérias primeiro, na página Matérias."
                : "Registre sua primeira sessão de estudo ou use o cronômetro."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ day, sessions: daySessions }) => (
            <div key={day.toISOString()} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold capitalize text-muted-foreground">
                {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h2>
              <div className="flex flex-col gap-2">
                {daySessions.map((session) => {
                  const subject = subjects.find((s) => s.id === session.subjectId);
                  const accuracy =
                    session.questionsTotal && session.questionsTotal > 0
                      ? Math.round(((session.questionsCorrect ?? 0) / session.questionsTotal) * 100)
                      : null;
                  return (
                    <Card key={session.id}>
                      <CardContent className="flex flex-wrap items-center gap-3 py-3">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: subject?.color }}
                          aria-hidden
                        />
                        <span className="font-medium">{subject?.name ?? "Matéria removida"}</span>
                        <Badge variant="secondary">{BLOCK_TYPE_LABELS[session.type]}</Badge>
                        <span className="text-sm text-muted-foreground">{session.durationMin}min</span>
                        {accuracy !== null ? <Badge variant="outline">{accuracy}% de acerto</Badge> : null}
                        {session.notes ? (
                          <span className="truncate text-sm text-muted-foreground">{session.notes}</span>
                        ) : null}
                        <div className="ml-auto flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label="Editar sessão" onClick={() => setEditingId(session.id)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Excluir sessão"
                            onClick={() => setDeletingId(session.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <SessionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        subjects={subjects}
        topics={topics}
        title="Nova sessão"
        onSubmit={handleCreate}
      />

      {editingSession ? (
        <SessionFormDialog
          open={Boolean(editingId)}
          onOpenChange={(open) => !open && setEditingId(null)}
          subjects={subjects}
          topics={topics}
          title="Editar sessão"
          initial={editingInitial}
          onSubmit={handleEdit}
        />
      ) : null}

      <AlertDialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              O tempo registrado será removido do progresso do ciclo. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
