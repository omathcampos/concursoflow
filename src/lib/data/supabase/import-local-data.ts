import type { SupabaseClient } from "@supabase/supabase-js";

import { hydrateSupabaseCache } from "@/lib/data/supabase/hydrate";
import {
  toAnnotationRow,
  toBlockRow,
  toCycleEntryRow,
  toCycleRow,
  toReviewRow,
  toSessionRow,
  toSubjectRow,
  toTopicRow,
} from "@/lib/data/supabase/mappers";
import type { Annotation, Block, Cycle, CycleEntry, Review, Session, Subject, Topic } from "@/lib/data/types";

const STORAGE_KEY = "concursoflow-v1";

interface LocalSnapshot {
  subjects: Subject[];
  topics: Topic[];
  cycles: Cycle[];
  cycleEntries: CycleEntry[];
  blocks: Block[];
  sessions: Session[];
  reviews: Review[];
  annotations: Annotation[];
}

export function readLocalSnapshot(): LocalSnapshot | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const state = parsed.state ?? {};
    return {
      subjects: state.subjects ?? [],
      topics: state.topics ?? [],
      cycles: state.cycles ?? [],
      cycleEntries: state.cycleEntries ?? [],
      blocks: state.blocks ?? [],
      sessions: state.sessions ?? [],
      reviews: state.reviews ?? [],
      annotations: state.annotations ?? [],
    };
  } catch {
    return null;
  }
}

export function countLocalRecords(snapshot: LocalSnapshot): number {
  return (
    snapshot.subjects.length +
    snapshot.topics.length +
    snapshot.cycles.length +
    snapshot.cycleEntries.length +
    snapshot.blocks.length +
    snapshot.sessions.length +
    snapshot.reviews.length +
    snapshot.annotations.length
  );
}

export interface ImportSummary {
  subjects: number;
  topics: number;
  cycles: number;
  cycleEntries: number;
  blocks: number;
  sessions: number;
  reviews: number;
  annotations: number;
}

/**
 * Importa o localStorage inteiro para o Supabase, remapeando ids (o Postgres
 * gera os seus). Ordem respeita as FKs: subjects → topics → cycles →
 * cycle_entries → blocks → sessions → reviews → annotations. Idempotente:
 * recusa se o usuário já tem QUALQUER matéria no servidor (evita duplicar).
 */
export async function importLocalDataToSupabase(client: SupabaseClient, userId: string): Promise<ImportSummary> {
  const snapshot = readLocalSnapshot();
  if (!snapshot) throw new Error("Nenhum dado local encontrado neste navegador.");

  const { count, error: countError } = await client.from("subjects").select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Já existem matérias no servidor — a importação foi cancelada para não duplicar dados.");
  }

  const subjectIdMap = new Map<string, string>();
  const topicIdMap = new Map<string, string>();
  const cycleIdMap = new Map<string, string>();
  const blockIdMap = new Map<string, string>();
  const sessionIdMap = new Map<string, string>();

  const summary: ImportSummary = { subjects: 0, topics: 0, cycles: 0, cycleEntries: 0, blocks: 0, sessions: 0, reviews: 0, annotations: 0 };

  if (snapshot.subjects.length > 0) {
    const rows = snapshot.subjects.map((s) => toSubjectRow(s, userId));
    const { data, error } = await client.from("subjects").insert(rows).select("id");
    if (error) throw error;
    snapshot.subjects.forEach((s, i) => subjectIdMap.set(s.id, data![i].id));
    summary.subjects = data!.length;
  }

  if (snapshot.topics.length > 0) {
    const rows = snapshot.topics.map((t) => toTopicRow({ ...t, subjectId: subjectIdMap.get(t.subjectId)! }, userId));
    const { data, error } = await client.from("topics").insert(rows).select("id");
    if (error) throw error;
    snapshot.topics.forEach((t, i) => topicIdMap.set(t.id, data![i].id));
    summary.topics = data!.length;
  }

  if (snapshot.cycles.length > 0) {
    const rows = snapshot.cycles.map((c) => toCycleRow(c, userId));
    const { data, error } = await client.from("cycles").insert(rows).select("id");
    if (error) throw error;
    snapshot.cycles.forEach((c, i) => cycleIdMap.set(c.id, data![i].id));
    summary.cycles = data!.length;
  }

  if (snapshot.cycleEntries.length > 0) {
    const rows = snapshot.cycleEntries.map((e) =>
      toCycleEntryRow({ cycleId: cycleIdMap.get(e.cycleId)!, subjectId: subjectIdMap.get(e.subjectId)!, targetMinutes: e.targetMinutes }, userId),
    );
    const { error } = await client.from("cycle_entries").insert(rows);
    if (error) throw error;
    summary.cycleEntries = rows.length;
  }

  if (snapshot.blocks.length > 0) {
    const rows = snapshot.blocks.map((b) =>
      toBlockRow({ ...b, subjectId: subjectIdMap.get(b.subjectId)!, topicId: b.topicId ? (topicIdMap.get(b.topicId) ?? null) : null }, userId),
    );
    const { data, error } = await client.from("blocks").insert(rows).select("id");
    if (error) throw error;
    snapshot.blocks.forEach((b, i) => blockIdMap.set(b.id, data![i].id));
    summary.blocks = data!.length;
  }

  if (snapshot.sessions.length > 0) {
    const rows = snapshot.sessions.map((s) =>
      toSessionRow(
        {
          ...s,
          subjectId: subjectIdMap.get(s.subjectId)!,
          topicId: s.topicId ? (topicIdMap.get(s.topicId) ?? null) : null,
          blockId: s.blockId ? (blockIdMap.get(s.blockId) ?? null) : null,
          cycleId: s.cycleId ? (cycleIdMap.get(s.cycleId) ?? null) : null,
        },
        userId,
      ),
    );
    const { data, error } = await client.from("sessions").insert(rows).select("id");
    if (error) throw error;
    snapshot.sessions.forEach((s, i) => sessionIdMap.set(s.id, data![i].id));
    summary.sessions = data!.length;
  }

  if (snapshot.reviews.length > 0) {
    const rows = snapshot.reviews.map((r) =>
      toReviewRow(
        {
          ...r,
          sessionId: r.sessionId ? (sessionIdMap.get(r.sessionId) ?? null) : null,
          subjectId: subjectIdMap.get(r.subjectId)!,
          topicId: r.topicId ? (topicIdMap.get(r.topicId) ?? null) : null,
        },
        userId,
      ),
    );
    const { error } = await client.from("reviews").insert(rows);
    if (error) throw error;
    summary.reviews = rows.length;
  }

  if (snapshot.annotations.length > 0) {
    const rows = snapshot.annotations.map((a) =>
      toAnnotationRow(
        {
          ...a,
          subjectId: a.subjectId ? (subjectIdMap.get(a.subjectId) ?? null) : null,
          topicId: a.topicId ? (topicIdMap.get(a.topicId) ?? null) : null,
        },
        userId,
      ),
    );
    const { error } = await client.from("annotations").insert(rows);
    if (error) throw error;
    summary.annotations = rows.length;
  }

  await hydrateSupabaseCache(client, userId);
  return summary;
}
