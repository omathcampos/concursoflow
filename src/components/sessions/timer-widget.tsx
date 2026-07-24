"use client";

import { Pause, Play, Square, Timer as TimerIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { SessionFormDialog } from "@/components/sessions/session-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { elapsedMs } from "@/lib/domain/timer";
import type { SessionFormData } from "@/lib/domain/session-validation";
import { useRepo, useTimer } from "@/lib/data/use-repo";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function TimerWidget() {
  const repo = useRepo();
  const { timer, start, pause, resume, stop } = useTimer();
  const [tick, setTick] = useState(() => new Date());
  const [pendingSubject, setPendingSubject] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [stopResult, setStopResult] = useState<{ subjectId: string; startedAt: string; durationMin: number } | null>(
    null,
  );

  const subjects = repo.subjects.list();
  const topics = repo.topics.list();
  const activeSubject = subjects.find((s) => s.id === timer.subjectId);

  useEffect(() => {
    if (timer.status !== "running") return;
    const interval = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(interval);
  }, [timer.status]);

  useEffect(() => {
    if (timer.status === "idle") {
      document.title = "ConcursoFlow";
      return;
    }
    document.title = `${formatElapsed(elapsedMs(timer, tick))} · ${activeSubject?.name ?? "Estudando"}`;
  }, [timer, tick, activeSubject]);

  function handleStop() {
    const result = stop();
    if (result.subjectId && result.startedAt) {
      setStopResult({ subjectId: result.subjectId, startedAt: result.startedAt, durationMin: Math.max(1, result.durationMin) });
      setFormOpen(true);
    }
  }

  function handleSubmitSession(data: SessionFormData) {
    const cycle = repo.cycle.getActive();
    const inCycle = cycle && repo.cycle.entries(cycle.id).some((e) => e.subjectId === data.subjectId);
    repo.sessions.create({
      ...data,
      blockId: null,
      cycleId: inCycle ? cycle!.id : null,
      cycleRound: inCycle ? cycle!.round : null,
    });
    setFormOpen(false);
    setStopResult(null);
  }

  return (
    <div className="fixed right-4 bottom-4 z-40">
      {timer.status === "idle" ? (
        <Card className="flex items-center gap-2 p-2">
          <Select value={pendingSubject} onValueChange={(value) => setPendingSubject(value ?? "")}>
            <SelectTrigger className="w-40" size="sm" aria-label="Matéria do cronômetro">
              <SelectValue placeholder="Matéria">
                {(value: string) => subjects.find((s) => s.id === value)?.name ?? "Matéria"}
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
          <Button size="sm" disabled={!pendingSubject} onClick={() => start(pendingSubject)}>
            <TimerIcon className="h-3.5 w-3.5" />
            Iniciar
          </Button>
        </Card>
      ) : (
        <Card className="flex items-center gap-3 p-3">
          <div>
            <p className="text-xs text-muted-foreground">{activeSubject?.name}</p>
            <p className="font-mono text-lg font-semibold tabular-nums">{formatElapsed(elapsedMs(timer, tick))}</p>
          </div>
          <div className="flex items-center gap-1">
            {timer.status === "running" ? (
              <Button size="icon-sm" variant="outline" onClick={pause} aria-label="Pausar">
                <Pause className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="icon-sm" variant="outline" onClick={resume} aria-label="Retomar">
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon-sm" variant="outline" onClick={handleStop} aria-label="Parar">
              <Square className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {stopResult ? (
        <SessionFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setStopResult(null);
          }}
          subjects={subjects}
          topics={topics}
          title="Registrar sessão do cronômetro"
          initial={{
            subjectId: stopResult.subjectId,
            startedAt: stopResult.startedAt,
            durationMin: stopResult.durationMin,
          }}
          onSubmit={handleSubmitSession}
        />
      ) : null}
    </div>
  );
}
