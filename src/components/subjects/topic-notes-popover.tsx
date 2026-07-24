"use client";

import { NotebookPen } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function TopicNotesPopover({
  notes,
  onSave,
}: {
  notes: string | null;
  onSave: (notes: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(notes ?? "");
  }

  function handleSave() {
    onSave(draft.trim() || null);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={notes ? "Editar observação do tópico" : "Adicionar observação ao tópico"}
          >
            <NotebookPen className={cn("h-3.5 w-3.5", notes ? "fill-primary/20 text-primary" : "text-muted-foreground")} />
          </Button>
        }
      />
      <PopoverContent className="flex w-72 flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ex.: cai muito na FGV, refazer questões..."
          rows={3}
          autoFocus
        />
        <Button size="sm" className="self-end" onClick={handleSave}>
          Salvar
        </Button>
      </PopoverContent>
    </Popover>
  );
}
