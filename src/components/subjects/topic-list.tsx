"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { TopicRow } from "@/components/subjects/topic-row";
import { Input } from "@/components/ui/input";
import { useRepo } from "@/lib/data/use-repo";
import type { Topic } from "@/lib/data/types";

export function TopicList({ subjectId, topics }: { subjectId: string; topics: Topic[] }) {
  const repo = useRepo();
  const [newTopicName, setNewTopicName] = useState("");

  const sorted = [...topics].sort((a, b) => a.position - b.position);

  function addTopic() {
    const name = newTopicName.trim();
    if (!name) return;
    const position = sorted.length > 0 ? sorted[sorted.length - 1].position + 1 : 0;
    repo.topics.create({ subjectId, name, status: "not_started", position, notes: null });
    setNewTopicName("");
  }

  function moveTopic(topic: Topic, direction: "up" | "down") {
    const index = sorted.findIndex((t) => t.id === topic.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const target = sorted[targetIndex];
    if (!target) return;
    repo.topics.update(topic.id, { position: target.position });
    repo.topics.update(target.id, { position: topic.position });
  }

  return (
    <div className="flex flex-col gap-0.5 pb-1">
      {sorted.map((topic, index) => (
        <TopicRow
          key={topic.id}
          topic={topic}
          isFirst={index === 0}
          isLast={index === sorted.length - 1}
          onUpdate={(patch) => repo.topics.update(topic.id, patch)}
          onMove={(direction) => moveTopic(topic, direction)}
          onRemove={() => repo.topics.remove(topic.id)}
        />
      ))}

      {sorted.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum tópico ainda.</p>
      ) : null}

      <div className="flex items-center gap-2 px-2 pt-1">
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Input
          value={newTopicName}
          onChange={(e) => setNewTopicName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTopic();
          }}
          placeholder="Adicionar tópico..."
          className="h-7 border-none px-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
