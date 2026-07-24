"use client";

import { Check, ChevronDown, ChevronUp, Circle, CircleDot, Trash2 } from "lucide-react";
import { useState } from "react";

import { TopicNotesPopover } from "@/components/subjects/topic-notes-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Topic, TopicStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const STATUS_ORDER: TopicStatus[] = ["not_started", "studying", "done"];

const STATUS_CONFIG: Record<TopicStatus, { label: string; icon: typeof Circle; className: string }> = {
  not_started: { label: "Não iniciado", icon: Circle, className: "text-muted-foreground" },
  studying: { label: "Estudando", icon: CircleDot, className: "text-amber-500" },
  done: { label: "Concluído", icon: Check, className: "text-emerald-500" },
};

function nextStatus(status: TopicStatus): TopicStatus {
  const index = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}

interface TopicRowProps {
  topic: Topic;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<Pick<Topic, "name" | "status" | "notes">>) => void;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
}

export function TopicRow({ topic, isFirst, isLast, onUpdate, onMove, onRemove }: TopicRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(topic.name);

  const status = STATUS_CONFIG[topic.status];
  const StatusIcon = status.icon;

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== topic.name) onUpdate({ name: trimmed });
    else setDraftName(topic.name);
    setEditing(false);
  }

  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <button
        type="button"
        onClick={() => onUpdate({ status: nextStatus(topic.status) })}
        aria-label={`Status: ${status.label}. Clique para avançar.`}
        className={cn("shrink-0", status.className)}
      >
        <StatusIcon className="h-4 w-4" />
      </button>

      {editing ? (
        <Input
          value={draftName}
          autoFocus
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraftName(topic.name);
              setEditing(false);
            }
          }}
          className="h-7 flex-1"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 truncate text-left text-sm",
            topic.status === "done" && "text-muted-foreground line-through",
          )}
        >
          {topic.name}
        </button>
      )}

      <TopicNotesPopover notes={topic.notes} onSave={(notes) => onUpdate({ notes })} />

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mover para cima"
          disabled={isFirst}
          onClick={() => onMove("up")}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mover para baixo"
          disabled={isLast}
          onClick={() => onMove("down")}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Excluir tópico" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
