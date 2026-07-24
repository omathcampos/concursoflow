"use client";

import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SubjectCard } from "@/components/subjects/subject-card";
import type { SubjectFormValues } from "@/components/subjects/subject-dialog";
import { SubjectDialog } from "@/components/subjects/subject-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsSeeded, useLoadSeed, useRepo } from "@/lib/data/use-repo";
import type { Subject } from "@/lib/data/types";

export default function MateriasPage() {
  const repo = useRepo();
  const isSeeded = useIsSeeded();
  const loadSeed = useLoadSeed();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | undefined>(undefined);

  const subjects = repo.subjects.list();
  const topics = repo.topics.list();

  function openCreateDialog() {
    setEditingSubject(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(subject: Subject) {
    setEditingSubject(subject);
    setDialogOpen(true);
  }

  function handleSubmit(values: SubjectFormValues) {
    if (editingSubject) {
      repo.subjects.update(editingSubject.id, values);
    } else {
      repo.subjects.create(values);
    }
  }

  function handleNewAnnotation(subject: Subject) {
    router.push(`/anotacoes?novaPara=${subject.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matérias</h1>
          <p className="mt-1 text-muted-foreground">Cadastre suas matérias e tópicos.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nova matéria
        </Button>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma matéria ainda</CardTitle>
            <CardDescription>Crie sua primeira matéria ou carregue dados de exemplo para explorar o app.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Nova matéria
            </Button>
            {!isSeeded ? (
              <Button variant="outline" onClick={loadSeed}>
                <Sparkles className="h-4 w-4" />
                Carregar dados de exemplo
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              topics={topics.filter((topic) => topic.subjectId === subject.id)}
              onEdit={() => openEditDialog(subject)}
              onDelete={() => repo.subjects.remove(subject.id)}
              onNewAnnotation={() => handleNewAnnotation(subject)}
            />
          ))}
        </div>
      )}

      <SubjectDialog open={dialogOpen} onOpenChange={setDialogOpen} subject={editingSubject} onSubmit={handleSubmit} />
    </div>
  );
}
