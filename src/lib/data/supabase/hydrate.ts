import type { SupabaseClient } from "@supabase/supabase-js";

import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import {
  fromAnnotationRow,
  fromBlockRow,
  fromCalendarFeedRow,
  fromCycleEntryRow,
  fromCycleRow,
  fromNotificationPrefsRow,
  fromProfileRow,
  fromReviewRow,
  fromSessionRow,
  fromSubjectRow,
  fromTopicRow,
} from "@/lib/data/supabase/mappers";

export interface HydrateOptions {
  /**
   * Revalidação em segundo plano (ex.: refetch ao focar a janela): não mexe
   * em `status`/`error` — a UI atual fica montada e intacta enquanto busca
   * dados novos, e uma falha (rede offline etc.) não aparece pro usuário,
   * só mantém os dados que já estavam na tela. Sem `silent` (boot inicial,
   * troca de usuário), o comportamento é o de sempre: `status` passa por
   * "loading" e o `DataProvider` mostra a tela de carregamento.
   */
  silent?: boolean;
}

/** Busca todas as tabelas do usuário em paralelo e popula o cache reativo. Chamada no boot e no refetch por foco de janela. */
export async function hydrateSupabaseCache(client: SupabaseClient, userId: string, options: HydrateOptions = {}): Promise<void> {
  const { silent = false } = options;
  const cache = useSupabaseCache.getState();
  if (!silent) cache.setStatus("loading");

  const [subjectsRes, topicsRes, cyclesRes, cycleEntriesRes, blocksRes, sessionsRes, reviewsRes, annotationsRes, profileRes, notificationPrefsRes] =
    await Promise.all([
      client.from("subjects").select("*"),
      client.from("topics").select("*"),
      client.from("cycles").select("*"),
      client.from("cycle_entries").select("*"),
      client.from("blocks").select("*"),
      client.from("sessions").select("*"),
      client.from("reviews").select("*"),
      client.from("annotations").select("*"),
      client.from("profiles").select("*").eq("id", userId).maybeSingle(),
      client.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle(),
    ]);

  const firstError = [
    subjectsRes,
    topicsRes,
    cyclesRes,
    cycleEntriesRes,
    blocksRes,
    sessionsRes,
    reviewsRes,
    annotationsRes,
    profileRes,
    notificationPrefsRes,
  ].find((res) => res.error)?.error;
  if (firstError) {
    if (!silent) cache.setError(firstError.message);
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
    notificationPrefs: notificationPrefsRes.data ? fromNotificationPrefsRow(notificationPrefsRes.data) : undefined,
    calendarFeed: profileRes.data ? fromCalendarFeedRow(profileRes.data) : undefined,
  });
}
