"use client";

import { Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Annotation, Subject, Topic } from "@/lib/data/types";

const AUTOSAVE_DELAY_MS = 600;
const NONE_VALUE = "__none__";

interface AnnotationEditorProps {
  annotation: Annotation;
  subjects: Subject[];
  topics: Topic[];
  onChange: (patch: Partial<Pick<Annotation, "title" | "content" | "subjectId" | "topicId">>) => void;
  onDelete: () => void;
}

export function AnnotationEditor({ annotation, subjects, topics, onChange, onDelete }: AnnotationEditorProps) {
  const [title, setTitle] = useState(annotation.title);
  const [content, setContent] = useState(annotation.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (title === annotation.title && content === annotation.content) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onChange({ title, content });
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  const topicsForSubject = topics.filter((topic) => topic.subjectId === annotation.subjectId);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da anotação"
          className="flex-1 border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <Button variant="ghost" size="icon" aria-label="Excluir anotação" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={annotation.subjectId ?? NONE_VALUE}
          onValueChange={(value) =>
            onChange({ subjectId: value === NONE_VALUE ? null : value, topicId: null })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Matéria (opcional)">
              {(value: string) =>
                value === NONE_VALUE ? "Sem matéria" : (subjects.find((s) => s.id === value)?.name ?? "Sem matéria")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Sem matéria</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={annotation.topicId ?? NONE_VALUE}
          onValueChange={(value) => onChange({ topicId: value === NONE_VALUE ? null : value })}
          disabled={!annotation.subjectId}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tópico (opcional)">
              {(value: string) =>
                value === NONE_VALUE ? "Sem tópico" : (topicsForSubject.find((t) => t.id === value)?.name ?? "Sem tópico")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Sem tópico</SelectItem>
            {topicsForSubject.map((topic) => (
              <SelectItem key={topic.id} value={topic.id}>
                {topic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="write" className="flex flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="write">Escrever</TabsTrigger>
          <TabsTrigger value="preview">Visualizar</TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva em markdown..."
            className="h-full min-h-64 resize-none font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="preview" className="flex-1 overflow-y-auto rounded-md border border-border p-4">
          {content.trim() ? (
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm text-muted-foreground">Nada para visualizar ainda.</p>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
