import type { SupabaseClient } from "@supabase/supabase-js";

import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import {
  fromAnnotationRow,
  fromBlockRow,
  fromCycleEntryRow,
  fromCycleRow,
  fromProfileRow,
  fromReviewRow,
  fromSessionRow,
  fromSubjectRow,
  fromTopicRow,
} from "@/lib/data/supabase/mappers";

/** Busca todas as tabelas do usuário em paralelo e popula o cache reativo. Chamada no boot e no refetch por foco de janela. */
export async function hydrateSupabaseCache(client: SupabaseClient, userId: string): Promise<void> {
  const cache = useSupabaseCache.getState();
  cache.setStatus("loading");

  const [subjectsRes, topicsRes, cyclesRes, cycleEntriesRes, blocksRes, sessionsRes, reviewsRes, annotationsRes, profileRes] = await Promise.all([
    client.from("subjects").select("*"),
    client.from("topics").select("*"),
    client.from("cycles").select("*"),
    client.from("cycle_entries").select("*"),
    client.from("blocks").select("*"),
    client.from("sessions").select("*"),
    client.from("reviews").select("*"),
    client.from("annotations").select("*"),
    client.from("profiles").select("*").eq("id", userId).maybeSingle(),
  ]);

  const firstError = [subjectsRes, topicsRes, cyclesRes, cycleEntriesRes, blocksRes, sessionsRes, reviewsRes, annotationsRes, profileRes].find(
    (res) => res.error,
  )?.error;
  if (firstError) {
    cache.setError(firstError.message);
    throw firstError;
  }

  cache.setSnapshot({
    subjects: (subjectsRes.data ?? []).map(fromSubjectRow),
    topics: (topicsRes.data ?? []).map(fromTopicRow),
    cycles: (cyclesRes.data ?? []).map(fromCycleRow),
    cycleEntries: (cycleEntriesRes.data ?? []).map(fromCycleEntryRow),
    blocks: (blocksRes.data ?? []).map(fromBlockRow),
    sessions: (sessionsRes.data ?? []).map(fromSessionRow),
    reviews: (reviewsRes.data ?? []).map(fromReviewRow),
    annotations: (annotationsRes.data ?? []).map(fromAnnotationRow),
    profile: profileRes.data ? fromProfileRow(profileRes.data) : useSupabaseCache.getState().profile,
  });
}
