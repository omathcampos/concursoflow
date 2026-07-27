"use client";

import { Copy, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Block, Review, Subject, Topic } from "@/lib/data/types";
import { useRepo } from "@/lib/data/use-repo";
import { buildICalFeed, type ICalBlock, type ICalReview, type ICalSubject } from "@/lib/domain/ical";

const FEED_BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calendar-feed`;

interface ExportCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Blocos já filtrados pro período visível (semana ou mês atual) — usados só pelo download avulso. */
  blocksInView: Block[];
  subjects: Subject[];
  topics: Topic[];
  reviews: Review[];
}

function toICalBlocks(blocks: Block[], topicsById: Map<string, Topic>): ICalBlock[] {
  return blocks.map((b) => ({
    id: b.id,
    subjectId: b.subjectId,
    topicName: b.topicId ? (topicsById.get(b.topicId)?.name ?? null) : null,
    type: b.type,
    status: b.status,
    startAt: b.startAt,
    endAt: b.endAt,
    notes: b.notes,
  }));
}

function downloadIcs(ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "concursoflow.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportCalendarDialog({ open, onOpenChange, blocksInView, subjects, topics, reviews }: ExportCalendarDialogProps) {
  const repo = useRepo();
  const feed = repo.calendarFeed.get();
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [savingReviews, setSavingReviews] = useState(false);

  const feedUrl = feed ? `${FEED_BASE_URL}?token=${feed.token}` : null;

  async function handleCopy() {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    toast.success("URL copiada.");
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await repo.calendarFeed.regenerateToken();
      toast.success("Nova URL gerada — a antiga parou de funcionar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar uma nova URL.");
    } finally {
      setRegenerating(false);
      setConfirmRegenerate(false);
    }
  }

  async function handleToggleReviews(checked: boolean) {
    setSavingReviews(true);
    try {
      await repo.calendarFeed.setIncludeReviews(checked);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a preferência.");
    } finally {
      setSavingReviews(false);
    }
  }

  function handleDownload() {
    const topicsById = new Map(topics.map((t) => [t.id, t]));
    const icalSubjects: ICalSubject[] = subjects.map((s) => ({ id: s.id, name: s.name }));
    const icalReviews: ICalReview[] | undefined = feed?.includeReviews
      ? reviews.filter((r) => r.status === "pending").map((r) => ({ id: r.id, subjectId: r.subjectId, dueDate: r.dueDate }))
      : undefined;
    const ics = buildICalFeed(toICalBlocks(blocksInView, topicsById), icalSubjects, { reviews: icalReviews });
    downloadIcs(ics);
    toast.success("Arquivo .ics baixado.");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Exportar calendário</DialogTitle>
            <DialogDescription>Assine no Google Agenda, Apple Calendar ou Outlook, ou baixe um .ics avulso.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Baixar período visível</p>
              <p className="text-sm text-muted-foreground">Gera um .ics com os blocos que estão na tela agora.</p>
              <div>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Baixar .ics
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4">
              <div>
                <p className="text-sm font-medium">Assinatura por URL</p>
                <p className="text-sm text-muted-foreground">Atualiza sozinha a cada algumas horas — Google e Apple não são em tempo real.</p>
              </div>

              {!feed ? (
                <p className="text-sm text-muted-foreground">Isso exige o backend Supabase — indisponível no modo local.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={feedUrl ?? ""} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                    <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar URL do feed">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-destructive">⚠️ Quem tiver esta URL vê o seu cronograma. Não compartilhe publicamente.</p>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Incluir revisões pendentes</p>
                      <p className="text-sm text-muted-foreground">Como eventos de dia inteiro.</p>
                    </div>
                    <Switch
                      aria-label="Incluir revisões no feed"
                      checked={feed.includeReviews}
                      onCheckedChange={handleToggleReviews}
                      disabled={savingReviews}
                    />
                  </div>

                  <div>
                    <Button variant="outline" size="sm" onClick={() => setConfirmRegenerate(true)} disabled={regenerating}>
                      <RefreshCw className="h-4 w-4" />
                      {regenerating ? "Gerando…" : "Regenerar URL"}
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Como assinar</p>
                    <p>
                      <strong className="text-foreground">Google Agenda:</strong> Configurações → Adicionar agenda → Por URL → cole o link acima.
                    </p>
                    <p>
                      <strong className="text-foreground">Apple Calendar:</strong> Arquivo → Nova assinatura de calendário (no iOS: Ajustes → Calendário
                      → Contas → Adicionar Conta → Outra → Adicionar Assinatura de Calendário) → cole o link.
                    </p>
                    <p>
                      <strong className="text-foreground">Outlook:</strong> Adicionar calendário → Assinar da web → cole o link.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar URL do feed?</AlertDialogTitle>
            <AlertDialogDescription>
              A URL antiga para de funcionar imediatamente. Você vai precisar assinar de novo com a nova URL em qualquer app onde já configurou.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>Regenerar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
