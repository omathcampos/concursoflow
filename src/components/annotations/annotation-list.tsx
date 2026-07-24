"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Annotation, Subject } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface AnnotationListProps {
  annotations: Annotation[];
  hasAnyAnnotations: boolean;
  subjects: Subject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  subjectFilter: string;
  onSubjectFilterChange: (value: string) => void;
  className?: string;
}

function subjectFor(subjects: Subject[], id: string | null) {
  return id ? subjects.find((s) => s.id === id) : undefined;
}

export function AnnotationList({
  annotations,
  hasAnyAnnotations,
  subjects,
  selectedId,
  onSelect,
  onCreate,
  search,
  onSearchChange,
  subjectFilter,
  onSubjectFilterChange,
  className,
}: AnnotationListProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar anotações..."
            className="pl-8"
          />
        </div>
        <Button size="icon" aria-label="Nova anotação" onClick={onCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Select value={subjectFilter} onValueChange={(value) => onSubjectFilterChange(value ?? "all")}>
        <SelectTrigger className="w-full">
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

      <div className="flex flex-col gap-1 overflow-y-auto">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-1 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              {hasAnyAnnotations ? "Nenhuma anotação encontrada para essa busca." : "Nenhuma anotação ainda."}
            </p>
            {hasAnyAnnotations ? null : (
              <Button size="sm" variant="outline" onClick={onCreate}>
                <Plus className="h-4 w-4" />
                Criar primeira anotação
              </Button>
            )}
          </div>
        ) : (
          annotations.map((annotation) => {
            const subject = subjectFor(subjects, annotation.subjectId);
            return (
              <button
                key={annotation.id}
                type="button"
                onClick={() => onSelect(annotation.id)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors",
                  annotation.id === selectedId ? "bg-primary/10" : "hover:bg-muted",
                )}
              >
                <span className="truncate text-sm font-medium">{annotation.title || "Sem título"}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {subject ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
                      {subject.name}
                      <span aria-hidden>·</span>
                    </>
                  ) : null}
                  {new Date(annotation.updatedAt).toLocaleDateString("pt-BR")}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
