"use client";

import { addDays, addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { BlockDetailsDialog } from "@/components/calendar/block-details-dialog";
import type { BlockFormValues } from "@/components/calendar/block-form-dialog";
import { BlockFormDialog } from "@/components/calendar/block-form-dialog";
import { MobileAgenda } from "@/components/calendar/mobile-agenda";
import { MonthGrid } from "@/components/calendar/month-grid";
import { WeekGrid } from "@/components/calendar/week-grid";
import { SessionFormDialog } from "@/components/sessions/session-form-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfWeek } from "@/lib/calendar";
import type { DeleteScope } from "@/lib/data/repository";
import type { Block } from "@/lib/data/types";
import { useRepo } from "@/lib/data/use-repo";
import { detectOverlap } from "@/lib/domain/blocks";
import type { SessionFormData } from "@/lib/domain/session-validation";

const RECURRING_WEEKS = 8;

function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

export default function CalendarioPage() {
  const repo = useRepo();
  const router = useRouter();

  const [view, setView] = useState<"week" | "month">("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [mobileDay, setMobileDay] = useState(() => new Date());

  const [createDialog, setCreateDialog] = useState<{ date: Date } | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [detailsBlockId, setDetailsBlockId] = useState<string | null>(null);
  const [completingBlockId, setCompletingBlockId] = useState<string | null>(null);

  const subjects = repo.subjects.list();
  const topics = repo.topics.list();
  const blocks = repo.blocks.list();
  const sessions = repo.sessions.list();
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));

  // Deriva sempre dos dados vivos do repo — nunca guarda cópia do bloco em
  // estado, senão marcar status/editar não refletiria no dialog aberto.
  const editingBlock = editingBlockId ? (blocks.find((b) => b.id === editingBlockId) ?? null) : null;
  const detailsBlock = detailsBlockId ? (blocks.find((b) => b.id === detailsBlockId) ?? null) : null;
  const completingBlock = completingBlockId ? (blocks.find((b) => b.id === completingBlockId) ?? null) : null;

  function shift(amount: number) {
    if (view === "week") setAnchorDate((d) => addDays(d, amount * 7));
    else setAnchorDate((d) => addMonths(d, amount));
  }

  function submitCreate(values: BlockFormValues) {
    const startAt = combineDateTime(values.date, values.startTime);
    const endAt = combineDateTime(values.date, values.endTime);
    const base = {
      subjectId: values.subjectId,
      topicId: values.topicId,
      type: values.type,
      status: "planned" as const,
      notes: null,
    };

    const candidate = { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
    if (detectOverlap(blocks, candidate)) {
      toast.error("Já existe um bloco nesse horário.");
      return;
    }

    if (values.repeatWeekly) {
      repo.blocks.createSeries({ ...base, ...candidate }, RECURRING_WEEKS);
      setCreateDialog(null);
      return;
    }

    repo.blocks.create({ ...base, ...candidate, recurrenceRule: null });
    setCreateDialog(null);
  }

  function submitEdit(block: Block, values: BlockFormValues) {
    const startAt = combineDateTime(values.date, values.startTime).toISOString();
    const endAt = combineDateTime(values.date, values.endTime).toISOString();
    if (detectOverlap(blocks, { id: block.id, startAt, endAt })) {
      toast.error("Já existe um bloco nesse horário.");
      return;
    }
    repo.blocks.update(block.id, {
      subjectId: values.subjectId,
      topicId: values.topicId,
      type: values.type,
      startAt,
      endAt,
    });
    setEditingBlockId(null);
  }

  function moveBlock(block: Block, nextStartAt: Date, nextEndAt: Date) {
    const candidate = { id: block.id, startAt: nextStartAt.toISOString(), endAt: nextEndAt.toISOString() };
    if (detectOverlap(blocks, candidate)) {
      toast.error("Já existe um bloco nesse horário.");
      return;
    }
    repo.blocks.update(block.id, { startAt: candidate.startAt, endAt: candidate.endAt });
  }

  function resizeBlock(block: Block, nextEndAt: Date) {
    const candidate = { id: block.id, startAt: block.startAt, endAt: nextEndAt.toISOString() };
    if (detectOverlap(blocks, candidate)) {
      toast.error("Já existe um bloco nesse horário.");
      return;
    }
    repo.blocks.update(block.id, { endAt: candidate.endAt });
  }

  function deleteBlock(block: Block, scope: DeleteScope) {
    repo.blocks.removeSeries(block.id, scope);
  }

  function goToAnnotation(block: Block) {
    router.push(`/anotacoes?novaPara=${block.subjectId}`);
  }

  function submitCompleteSession(data: SessionFormData) {
    if (!completingBlock) return;
    const cycle = repo.cycle.getActive();
    const inCycle = cycle && repo.cycle.entries(cycle.id).some((e) => e.subjectId === data.subjectId);
    repo.sessions.create({
      ...data,
      blockId: completingBlock.id,
      cycleId: inCycle ? cycle!.id : null,
      cycleRound: inCycle ? cycle!.round : null,
    });
    repo.blocks.update(completingBlock.id, { status: "done" });
    setCompletingBlockId(null);
    setDetailsBlockId(null);
  }

  const weekStart = startOfWeek(anchorDate);
  const detailsSubject = detailsBlock ? subjectsById.get(detailsBlock.subjectId) : undefined;
  const detailsTopic = detailsBlock?.topicId ? topics.find((t) => t.id === detailsBlock.topicId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="mt-1 text-muted-foreground">Organize sua semana de estudos.</p>
        </div>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cadastre matérias na página Matérias antes de criar blocos.</p>
        ) : null}
      </div>

      {/* Desktop: semana/mês */}
      <div className="hidden flex-col gap-4 md:flex">
        <div className="flex items-center justify-between gap-4">
          <Tabs value={view} onValueChange={(v) => setView(v as "week" | "month")}>
            <TabsList>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchorDate(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Próximo">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-sm font-medium capitalize">
              {view === "week"
                ? `${format(weekStart, "dd/MM")} – ${format(addDays(weekStart, 6), "dd/MM/yyyy")}`
                : format(anchorDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>

        {view === "week" ? (
          <WeekGrid
            weekStart={weekStart}
            blocks={blocks}
            subjectsById={subjectsById}
            onCreateAt={(date) => setCreateDialog({ date })}
            onOpenBlock={(block) => setDetailsBlockId(block.id)}
            onMoveBlock={moveBlock}
            onResizeBlock={resizeBlock}
          />
        ) : (
          <MonthGrid
            month={anchorDate}
            blocks={blocks}
            subjectsById={subjectsById}
            onSelectDay={(day) => {
              setAnchorDate(day);
              setView("week");
            }}
          />
        )}
      </div>

      {/* Mobile: agenda do dia */}
      <div className="md:hidden">
        <MobileAgenda
          day={mobileDay}
          blocks={blocks}
          subjectsById={subjectsById}
          onPrevDay={() => setMobileDay((d) => addDays(d, -1))}
          onNextDay={() => setMobileDay((d) => addDays(d, 1))}
          onToday={() => setMobileDay(new Date())}
          onCreate={() => setCreateDialog({ date: mobileDay })}
          onOpenBlock={(block) => setDetailsBlockId(block.id)}
        />
      </div>

      {createDialog ? (
        <BlockFormDialog
          open
          onOpenChange={(open) => !open && setCreateDialog(null)}
          subjects={subjects}
          topics={topics}
          initialDate={createDialog.date}
          onSubmit={submitCreate}
        />
      ) : null}

      {editingBlock ? (
        <BlockFormDialog
          open
          onOpenChange={(open) => !open && setEditingBlockId(null)}
          subjects={subjects}
          topics={topics}
          block={editingBlock}
          onSubmit={(values) => submitEdit(editingBlock, values)}
        />
      ) : null}

      {detailsBlock && detailsSubject ? (
        <BlockDetailsDialog
          open
          onOpenChange={(open) => !open && setDetailsBlockId(null)}
          block={detailsBlock}
          subject={detailsSubject}
          topic={detailsTopic}
          hasLinkedSession={sessions.some((s) => s.blockId === detailsBlock.id)}
          onEdit={() => {
            setEditingBlockId(detailsBlock.id);
            setDetailsBlockId(null);
          }}
          onMarkStatus={(status) => repo.blocks.update(detailsBlock.id, { status })}
          onCompleteWithSession={() => setCompletingBlockId(detailsBlock.id)}
          onDelete={(scope) => deleteBlock(detailsBlock, scope)}
          onNewAnnotation={() => goToAnnotation(detailsBlock)}
        />
      ) : null}

      {completingBlock ? (
        <SessionFormDialog
          open
          onOpenChange={(open) => !open && setCompletingBlockId(null)}
          subjects={subjects}
          topics={topics}
          title="Concluir bloco — registrar sessão"
          initial={{
            subjectId: completingBlock.subjectId,
            topicId: completingBlock.topicId,
            type: completingBlock.type,
            startedAt: completingBlock.startAt,
            durationMin: Math.round(
              (new Date(completingBlock.endAt).getTime() - new Date(completingBlock.startAt).getTime()) / 60_000,
            ),
          }}
          onSubmit={submitCompleteSession}
        />
      ) : null}
    </div>
  );
}
