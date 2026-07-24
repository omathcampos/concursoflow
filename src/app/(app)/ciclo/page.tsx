"use client";

import { PartyPopper, RefreshCw, Settings2, Sparkles, Target } from "lucide-react";
import { useState } from "react";

import { CycleSetupDialog } from "@/components/cycle/cycle-setup-dialog";
import { SubjectProgressRow } from "@/components/cycle/subject-progress-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isCycleComplete, suggestNextSubject } from "@/lib/domain/cycle";
import { useIsSeeded, useLoadSeed, useRepo } from "@/lib/data/use-repo";

export default function CicloPage() {
  const repo = useRepo();
  const isSeeded = useIsSeeded();
  const loadSeed = useLoadSeed();
  const [setupOpen, setSetupOpen] = useState(false);

  const subjects = repo.subjects.list();
  const cycle = repo.cycle.getActive();
  const entries = cycle ? repo.cycle.entries(cycle.id) : [];

  const entriesWithSubject = entries
    .map((entry) => ({ entry, subject: subjects.find((s) => s.id === entry.subjectId) }))
    .filter((row): row is { entry: (typeof entries)[number]; subject: NonNullable<(typeof row)["subject"]> } =>
      Boolean(row.subject),
    );

  const progressEntries = entries.map((entry) => {
    const subject = subjects.find((s) => s.id === entry.subjectId);
    return { subjectId: entry.subjectId, weight: subject?.weight ?? 1, targetMinutes: entry.targetMinutes, doneMinutes: entry.doneMinutes };
  });

  const suggestedSubjectId = suggestNextSubject(progressEntries);
  const suggestedSubject = subjects.find((s) => s.id === suggestedSubjectId);
  const roundComplete = isCycleComplete(progressEntries);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ciclo</h1>
          <p className="mt-1 text-muted-foreground">Defina o rodízio de matérias.</p>
        </div>
        {cycle ? (
          <Button variant="outline" onClick={() => setSetupOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Editar ciclo
          </Button>
        ) : null}
      </div>

      {!cycle || entries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum ciclo montado</CardTitle>
            <CardDescription>
              Escolha as matérias e a carga-horária alvo por rodada para começar a estudar em ciclo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => setSetupOpen(true)} disabled={subjects.length === 0}>
              <Settings2 className="h-4 w-4" />
              Montar ciclo
            </Button>
            {!isSeeded ? (
              <Button variant="outline" onClick={loadSeed}>
                <Sparkles className="h-4 w-4" />
                Carregar dados de exemplo
              </Button>
            ) : null}
            {subjects.length === 0 ? (
              <p className="w-full text-sm text-muted-foreground">Cadastre matérias primeiro, na página Matérias.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          {roundComplete ? (
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <PartyPopper className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-medium">Rodada {cycle.round} concluída! 🎉</p>
                    <p className="text-sm text-muted-foreground">Todas as matérias atingiram a meta.</p>
                  </div>
                </div>
                <Button onClick={() => repo.cycle.startNewRound(cycle.id)}>
                  <RefreshCw className="h-4 w-4" />
                  Nova rodada
                </Button>
              </CardContent>
            </Card>
          ) : suggestedSubject ? (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-4">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Estude agora</p>
                  <p className="font-semibold">{suggestedSubject.name}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Rodada {cycle.round}</CardTitle>
              <CardDescription>Progresso de cada matéria na rodada atual.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {entriesWithSubject.map(({ entry, subject }) => (
                <SubjectProgressRow key={entry.id} subject={subject} entry={entry} />
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <CycleSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        subjects={subjects}
        cycle={cycle}
        entries={entries}
        onSubmit={(nextEntries) => repo.cycle.setup(cycle?.name ?? "Meu ciclo", nextEntries)}
      />
    </div>
  );
}
