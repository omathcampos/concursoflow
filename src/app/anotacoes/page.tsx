"use client";

import { ArrowLeft, NotebookPen } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AnnotationEditor } from "@/components/annotations/annotation-editor";
import { AnnotationList } from "@/components/annotations/annotation-list";
import { Button } from "@/components/ui/button";
import { useRepo } from "@/lib/data/use-repo";
import { cn } from "@/lib/utils";

function AnotacoesContent() {
  const repo = useRepo();
  const searchParams = useSearchParams();
  const novaPara = searchParams.get("novaPara");
  const handledNovaPara = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const subjects = repo.subjects.list();
  const topics = repo.topics.list();
  const annotations = repo.annotations
    .list()
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  useEffect(() => {
    if (!novaPara || handledNovaPara.current) return;
    handledNovaPara.current = true;
    const created = repo.annotations.create({ title: "", content: "", subjectId: novaPara, topicId: null });
    setSelectedId(created.id);
    window.history.replaceState(null, "", "/anotacoes");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novaPara]);

  const filtered = annotations.filter((annotation) => {
    if (subjectFilter !== "all" && annotation.subjectId !== subjectFilter) return false;
    if (!search.trim()) return true;
    const haystack = `${annotation.title} ${annotation.content}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const selected = selectedId ? repo.annotations.get(selectedId) : undefined;

  function handleCreate() {
    const created = repo.annotations.create({ title: "", content: "", subjectId: null, topicId: null });
    setSelectedId(created.id);
  }

  function handleDelete(id: string) {
    repo.annotations.remove(id);
    setSelectedId(null);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Anotações</h1>
        <p className="mt-1 text-muted-foreground">Seu caderno de anotações em markdown.</p>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden md:grid-cols-[320px_1fr]">
        <div className={cn("flex flex-col overflow-hidden", selected ? "hidden md:flex" : "flex")}>
          <AnnotationList
            annotations={filtered}
            subjects={subjects}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={handleCreate}
            search={search}
            onSearchChange={setSearch}
            subjectFilter={subjectFilter}
            onSubjectFilterChange={setSubjectFilter}
            className="flex-1 overflow-hidden"
          />
        </div>

        <div className={cn("flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4", selected ? "flex" : "hidden md:flex")}>
          {selected ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 w-fit md:hidden"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <AnnotationEditor
                key={selected.id}
                annotation={selected}
                subjects={subjects}
                topics={topics}
                onChange={(patch) => repo.annotations.update(selected.id, patch)}
                onDelete={() => handleDelete(selected.id)}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <NotebookPen className="h-8 w-8" />
              <p className="text-sm">Selecione uma anotação ou crie uma nova.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnotacoesPage() {
  return (
    <Suspense>
      <AnotacoesContent />
    </Suspense>
  );
}
