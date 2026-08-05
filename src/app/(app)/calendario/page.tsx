"use client";

import { addDays, addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { BlockDetailsDialog } from "@/components/calendar/block-details-dialog";
import type { BlockFormValues } from "@/components/calendar/block-form-dialog";
import { BlockFormDialog } from "@/components/calendar/block-form-dialog";
import { ExportCalendarDialog } from "@/components/calendar/export-calendar-dialog";
import { MobileAgenda } from "@/components/calendar/mobile-agenda";
import { MonthGrid } from "@/components/calendar/month-grid";
import { SessionDetailsDialog } from "@/components/calendar/session-details-dialog";
import { WeekGrid } from "@/components/calendar/week-grid";
import type { SessionFormInitial } from "@/components/sessions/session-form-dialog";
import { SessionFormDialog } from "@/components/sessions/session-form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfWeek } from "@/lib/calendar";
import type { DeleteScope } from "@/lib/data/repository";
import type { Block, Review, Session } from "@/lib/data/types";
import { useRepo } from "@/lib/data/use-repo";
import { detectOverlap } from "@/lib/domain/blocks";
import type { SessionFormData } from "@/lib/domain/session-validation";

const SHOW_SESSIONS_STORAGE_KEY = "concursoflow-calendar-show-sessions";

/**
 * Preferência "mostrar sessões realizadas" via useSyncExternalStore (não
 * useState+useEffect): SSR não tem localStorage, então o snapshot do
 * servidor é sempre `true` (default), e o React troca pro valor real do
 * client automaticamente logo após a hidratação — sem o mismatch/flicker
 * que useState(lazy init) + efeito causava (chegou a ficar preso em `true`
 * após reload em teste manual).
 */
const showSessionsListeners = new Set<() => void>();
function subscribeShowSessions(onStoreChange: () => void) {
  showSessionsListeners.add(onStoreChange);
  return () => showSessionsListeners.delete(onStoreChange);
}
function getShowSessionsSnapshot(): boolean {
  return window.localStorage.getItem(SHOW_SESSIONS_STORAGE_KEY) !== "false";
}
function getShowSessionsServerSnapshot(): boolean {
  return true;
}
function setShowSessionsPreference(value: boolean) {
  window.localStorage.setItem(SHOW_SESSIONS_STORAGE_KEY, String(value));
  showSessionsListeners.forEach((listener) => listener());
}

// A semana/dia iniciais vêm de `new Date()` — sem isso, o Next pré-renderiza
// a página como estática e "congela" a data no momento do build, causando
// hydration mismatch no header (semana errada) até o cliente corrigir.
export const dynamic = "force-dynamic";

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
  const [completingReviewId, setCompletingReviewId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const showSessions = useSyncExternalStore(subscribeShowSessions, getShowSessionsSnapshot, getShowSessionsServerSnapshot);
  const [detailsSessionId, setDetailsSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const subjects = repo.subjects.list();
  const topics = repo.topics.list();
  const blocks = repo.blocks.list();
  const sessions = repo.sessions.list();
  const reviews = repo.reviews.list();
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));

  // Deriva sempre dos dados vivos do repo — nunca guarda cópia do bloco em
  // estado, senão marcar status/editar não refletiria no dialog aberto.
  const editingBlock = editingBlockId ? (blocks.find((b) => b.id === editingBlockId) ?? null) : null;
  const detailsBlock = detailsBlockId ? (blocks.find((b) => b.id === detailsBlockId) ?? null) : null;
  const completingBlock = completingBlockId ? (blocks.find((b) => b.id === completingBlockId) ?? null) : null;
  const completingReview = completingReviewId ? (reviews.find((r) => r.id === completingReviewId) ?? null) : null;
  const detailsSession = detailsSessionId ? (sessions.find((s) => s.id === detailsSessionId) ?? null) : null;
  const editingSession = editingSessionId ? (sessions.find((s) => s.id === editingSessionId) ?? null) : null;

  function toggleShowSessions(value: boolean) {
    setShowSessionsPreference(value);
  }

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

  // Sessão avulsa (sem block_id) arrastada/redimensionada direto na grade —
  // corrige o registro sem passar pelo detectOverlap (sessão não é
  // planejamento, pode coexistir com blocos/outras sessões no horário).
  function moveSession(session: Session, nextStartedAt: Date) {
    repo.sessions.update(session.id, { startedAt: nextStartedAt.toISOString() });
  }

  function resizeSession(session: Session, nextDurationMin: number) {
    repo.sessions.update(session.id, { durationMin: nextDurationMin });
  }

  function submitEditSession(data: SessionFormData) {
    if (!editingSession) return;
    repo.sessions.update(editingSession.id, data);
    setEditingSessionId(null);
  }

  function deleteSession() {
    if (!detailsSession) return;
    repo.sessions.remove(detailsSession.id);
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

  function submitCompleteReview(data: SessionFormData) {
    if (!completingReview) return;
    const cycle = repo.cycle.getActive();
    const inCycle = cycle && repo.cycle.entries(cycle.id).some((e) => e.subjectId === data.subjectId);
    repo.sessions.create({
      ...data,
      blockId: null,
      cycleId: inCycle ? cycle!.id : null,
      cycleRound: inCycle ? cycle!.round : null,
    });
    repo.reviews.complete(completingReview.id);
    setCompletingReviewId(null);
  }

  function skipReview(review: Review) {
    repo.reviews.skip(review.id);
    toast("Revisão pulada", {
      action: {
        label: "Desfazer",
        onClick: () => repo.reviews.update(review.id, { status: "pending" }),
      },
    });
  }

  const weekStart = startOfWeek(anchorDate);
  const rangeStart = view === "week" ? weekStart : startOfMonth(anchorDate);
  const rangeEnd = view === "week" ? addDays(weekStart, 7) : endOfMonth(anchorDate);
  const blocksInView = blocks.filter((b) => {
    const t = new Date(b.startAt);
    return t >= rangeStart && t <= rangeEnd;
  });
  const detailsSubject = detailsBlock ? subjectsById.get(detailsBlock.subjectId) : undefined;
  const detailsTopic = detailsBlock?.topicId ? topics.find((t) => t.id === detailsBlock.topicId) : undefined;
  const detailsSessionSubject = detailsSession ? subjectsById.get(detailsSession.subjectId) : undefined;
  const detailsSessionTopic = detailsSession?.topicId ? topics.find((t) => t.id === detailsSession.topicId) : undefined;
  const editingSessionInitial: SessionFormInitial | undefined = editingSession
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
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="mt-1 text-muted-foreground">Organize sua semana de estudos.</p>
        </div>
        <div className="flex items-center gap-4">
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cadastre matérias na página Matérias antes de criar blocos.</p>
          ) : null}
          <div className="flex items-center gap-2">
            <Switch id="show-sessions" checked={showSessions} onCheckedChange={toggleShowSessions} />
            <Label htmlFor="show-sessions" className="text-sm text-muted-foreground">
              Mostrar sessões realizadas
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Exportar
          </Button>
        </div>
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
            reviews={reviews}
            sessions={sessions}
            showSessions={showSessions}
            subjectsById={subjectsById}
            onCreateAt={(date) => setCreateDialog({ date })}
            onOpenBlock={(block) => setDetailsBlockId(block.id)}
            onMoveBlock={moveBlock}
            onResizeBlock={resizeBlock}
            onCompleteReview={(review) => setCompletingReviewId(review.id)}
            onSkipReview={skipReview}
            onOpenSession={(session) => setDetailsSessionId(session.id)}
            onMoveSession={moveSession}
            onResizeSession={resizeSession}
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

      {detailsSession && detailsSessionSubject ? (
        <SessionDetailsDialog
          open
          onOpenChange={(open) => !open && setDetailsSessionId(null)}
          session={detailsSession}
          subject={detailsSessionSubject}
          topic={detailsSessionTopic}
          onEdit={() => {
            setEditingSessionId(detailsSession.id);
            setDetailsSessionId(null);
          }}
          onDelete={deleteSession}
        />
      ) : null}

      {editingSession ? (
        <SessionFormDialog
          open
          onOpenChange={(open) => !open && setEditingSessionId(null)}
          subjects={subjects}
          topics={topics}
          title="Editar sessão"
          initial={editingSessionInitial}
          onSubmit={submitEditSession}
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

      {completingReview ? (
        <SessionFormDialog
          open
          onOpenChange={(open) => !open && setCompletingReviewId(null)}
          subjects={subjects}
          topics={topics}
          title="Revisado — registrar sessão"
          initial={{
            subjectId: completingReview.subjectId,
            topicId: completingReview.topicId,
            type: "revisao",
            scheduleReview: false,
          }}
          onSubmit={submitCompleteReview}
        />
      ) : null}

      <ExportCalendarDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        blocksInView={blocksInView}
        subjects={subjects}
        topics={topics}
        reviews={reviews}
      />
    </div>
  );
}
