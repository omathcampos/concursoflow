import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";

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
  toAnnotationRow,
  toBlockRow,
  toCycleEntryRow,
  toCycleRow,
  toNotificationPrefsRow,
  toProfileRow,
  toReviewRow,
  toSessionRow,
  toSubjectRow,
  toTopicRow,
} from "@/lib/data/supabase/mappers";
import { generateWeeklyOccurrences } from "@/lib/domain/blocks";
import { nextReviewStep, scheduleFirstReview } from "@/lib/domain/reviews";
import type {
  BlockRepo,
  CalendarFeedRepo,
  CrudRepo,
  CycleRepo,
  NotificationsRepo,
  NotificationTestResult,
  ProfileRepo,
  Repository,
  ReviewRepo,
} from "@/lib/data/repository";
import type { Annotation, Cycle, Profile, Session, Subject, Topic } from "@/lib/data/types";

/** Código curto (sem caracteres ambíguos) pro fluxo `/start CODIGO` do bot do Telegram. */
function generateLinkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function withErrorToast<T>(action: () => Promise<T>, message: string): Promise<T> {
  try {
    return await action();
  } catch (err) {
    toast.error(message);
    throw err;
  }
}

export function createSupabaseRepository(client: SupabaseClient, userId: string): Repository {
  const cache = () => useSupabaseCache.getState();
  const setCache = useSupabaseCache.setState;

  const subjects: CrudRepo<Subject, "id" | "createdAt"> = {
    list: () => cache().subjects,
    get: (id) => cache().subjects.find((s) => s.id === id),
    create: (input) =>
      withErrorToast(async () => {
        const { data, error } = await client.from("subjects").insert(toSubjectRow(input, userId)).select().single();
        if (error) throw error;
        const subject = fromSubjectRow(data);
        setCache((s) => ({ subjects: [...s.subjects, subject] }));
        return subject;
      }, "Não foi possível salvar a matéria."),
    update: (id, patch) =>
      withErrorToast(async () => {
        const current = cache().subjects.find((s) => s.id === id);
        if (!current) throw new Error(`Subject ${id} não encontrada`);
        const merged = { ...current, ...patch };
        const { data, error } = await client.from("subjects").update(toSubjectRow(merged, userId)).eq("id", id).select().single();
        if (error) throw error;
        const subject = fromSubjectRow(data);
        setCache((s) => ({ subjects: s.subjects.map((x) => (x.id === id ? subject : x)) }));
        return subject;
      }, "Não foi possível atualizar a matéria."),
    remove: (id) =>
      withErrorToast(async () => {
        const { error } = await client.from("subjects").delete().eq("id", id);
        if (error) throw error;
        setCache((s) => ({
          subjects: s.subjects.filter((x) => x.id !== id),
          topics: s.topics.filter((t) => t.subjectId !== id),
          cycleEntries: s.cycleEntries.filter((e) => e.subjectId !== id),
          blocks: s.blocks.filter((b) => b.subjectId !== id),
          sessions: s.sessions.filter((sess) => sess.subjectId !== id),
          reviews: s.reviews.filter((r) => r.subjectId !== id),
          annotations: s.annotations.map((a) => (a.subjectId === id ? { ...a, subjectId: null } : a)),
        }));
      }, "Não foi possível excluir a matéria."),
  };

  const topics: CrudRepo<Topic, "id" | "createdAt"> = {
    list: () => cache().topics,
    get: (id) => cache().topics.find((t) => t.id === id),
    create: (input) =>
      withErrorToast(async () => {
        const { data, error } = await client.from("topics").insert(toTopicRow(input, userId)).select().single();
        if (error) throw error;
        const topic = fromTopicRow(data);
        setCache((s) => ({ topics: [...s.topics, topic] }));
        return topic;
      }, "Não foi possível salvar o tópico."),
    update: (id, patch) =>
      withErrorToast(async () => {
        const current = cache().topics.find((t) => t.id === id);
        if (!current) throw new Error(`Topic ${id} não encontrado`);
        const merged = { ...current, ...patch };
        const { data, error } = await client.from("topics").update(toTopicRow(merged, userId)).eq("id", id).select().single();
        if (error) throw error;
        const topic = fromTopicRow(data);
        setCache((s) => ({ topics: s.topics.map((x) => (x.id === id ? topic : x)) }));
        return topic;
      }, "Não foi possível atualizar o tópico."),
    remove: (id) =>
      withErrorToast(async () => {
        const { error } = await client.from("topics").delete().eq("id", id);
        if (error) throw error;
        setCache((s) => ({
          topics: s.topics.filter((t) => t.id !== id),
          annotations: s.annotations.map((a) => (a.topicId === id ? { ...a, topicId: null } : a)),
          sessions: s.sessions.map((sess) => (sess.topicId === id ? { ...sess, topicId: null } : sess)),
          reviews: s.reviews.map((r) => (r.topicId === id ? { ...r, topicId: null } : r)),
        }));
      }, "Não foi possível excluir o tópico."),
  };

  const annotations: CrudRepo<Annotation, "id" | "createdAt" | "updatedAt"> = {
    list: () => cache().annotations,
    get: (id) => cache().annotations.find((a) => a.id === id),
    create: (input) =>
      withErrorToast(async () => {
        const { data, error } = await client.from("annotations").insert(toAnnotationRow(input, userId)).select().single();
        if (error) throw error;
        const annotation = fromAnnotationRow(data);
        setCache((s) => ({ annotations: [...s.annotations, annotation] }));
        return annotation;
      }, "Não foi possível salvar a anotação."),
    update: (id, patch) =>
      withErrorToast(async () => {
        const current = cache().annotations.find((a) => a.id === id);
        if (!current) throw new Error(`Annotation ${id} não encontrada`);
        const merged = { ...current, ...patch };
        const { data, error } = await client
          .from("annotations")
          .update({ ...toAnnotationRow(merged, userId), updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        const annotation = fromAnnotationRow(data);
        setCache((s) => ({ annotations: s.annotations.map((x) => (x.id === id ? annotation : x)) }));
        return annotation;
      }, "Não foi possível atualizar a anotação."),
    remove: (id) =>
      withErrorToast(async () => {
        const { error } = await client.from("annotations").delete().eq("id", id);
        if (error) throw error;
        setCache((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) }));
      }, "Não foi possível excluir a anotação."),
  };

  const cycle: CycleRepo = {
    getActive: () => cache().cycles.find((c) => c.isActive),
    entries: (cycleId) => {
      const activeCycle = cache().cycles.find((c) => c.id === cycleId);
      return cache()
        .cycleEntries.filter((entry) => entry.cycleId === cycleId)
        .map((entry) => ({
          ...entry,
          doneMinutes: cache()
            .sessions.filter(
              (session) => session.cycleId === cycleId && session.cycleRound === activeCycle?.round && session.subjectId === entry.subjectId,
            )
            .reduce((sum, session) => sum + session.durationMin, 0),
        }));
    },
    setup: (name, entries) =>
      withErrorToast(async () => {
        const existing = cache().cycles.find((c) => c.isActive);
        let activeCycle: Cycle;

        if (!existing) {
          const { data, error } = await client.from("cycles").insert(toCycleRow({ name, isActive: true, round: 1 }, userId)).select().single();
          if (error) throw error;
          activeCycle = fromCycleRow(data);
          setCache((s) => ({ cycles: [...s.cycles, activeCycle] }));
        } else if (existing.name !== name) {
          const { data, error } = await client.from("cycles").update({ name }).eq("id", existing.id).select().single();
          if (error) throw error;
          activeCycle = fromCycleRow(data);
          setCache((s) => ({ cycles: s.cycles.map((c) => (c.id === activeCycle.id ? activeCycle : c)) }));
        } else {
          activeCycle = existing;
        }

        const currentEntries = cache().cycleEntries.filter((e) => e.cycleId === activeCycle.id);
        const nextSubjectIds = new Set(entries.map((e) => e.subjectId));
        const toDelete = currentEntries.filter((e) => !nextSubjectIds.has(e.subjectId));

        if (toDelete.length > 0) {
          const { error } = await client.from("cycle_entries").delete().in(
            "id",
            toDelete.map((e) => e.id),
          );
          if (error) throw error;
        }

        if (entries.length > 0) {
          const rows = entries.map((e) => toCycleEntryRow({ cycleId: activeCycle.id, subjectId: e.subjectId, targetMinutes: e.targetMinutes }, userId));
          const { error } = await client.from("cycle_entries").upsert(rows, { onConflict: "cycle_id,subject_id" });
          if (error) throw error;
        }

        // Reconciliação via refetch — mais simples e segura que replicar o upsert no cache à mão.
        const { data: freshEntries, error: fetchError } = await client.from("cycle_entries").select("*").eq("cycle_id", activeCycle.id);
        if (fetchError) throw fetchError;
        setCache((s) => ({
          cycleEntries: [...s.cycleEntries.filter((e) => e.cycleId !== activeCycle.id), ...(freshEntries ?? []).map(fromCycleEntryRow)],
        }));

        return activeCycle;
      }, "Não foi possível salvar o ciclo."),
    startNewRound: (cycleId) =>
      withErrorToast(async () => {
        const current = cache().cycles.find((c) => c.id === cycleId);
        if (!current) throw new Error(`Cycle ${cycleId} não encontrado`);
        const { data, error } = await client.from("cycles").update({ round: current.round + 1 }).eq("id", cycleId).select().single();
        if (error) throw error;
        const updated = fromCycleRow(data);
        setCache((s) => ({ cycles: s.cycles.map((c) => (c.id === cycleId ? updated : c)) }));
        return updated;
      }, "Não foi possível iniciar a nova rodada."),
  };

  async function createSessionInternal(input: Omit<Session, "id" | "createdAt">): Promise<Session> {
    const { data, error } = await client.from("sessions").insert(toSessionRow(input, userId)).select().single();
    if (error) throw error;
    const session = fromSessionRow(data);
    setCache((s) => ({ sessions: [...s.sessions, session] }));

    if (session.scheduleReview) {
      const reviewInput = scheduleFirstReview({ sessionId: session.id, subjectId: session.subjectId, topicId: session.topicId });
      const { data: reviewData, error: reviewError } = await client.from("reviews").insert(toReviewRow(reviewInput, userId)).select().single();
      if (reviewError) throw reviewError;
      const review = fromReviewRow(reviewData);
      setCache((s) => ({ reviews: [...s.reviews, review] }));
    }

    return session;
  }

  const sessions: CrudRepo<Session, "id" | "createdAt"> = {
    list: () => cache().sessions,
    get: (id) => cache().sessions.find((sess) => sess.id === id),
    create: (input) => withErrorToast(() => createSessionInternal(input), "Não foi possível salvar a sessão."),
    update: (id, patch) =>
      withErrorToast(async () => {
        const current = cache().sessions.find((sess) => sess.id === id);
        if (!current) throw new Error(`Session ${id} não encontrada`);
        const merged = { ...current, ...patch };
        const { data, error } = await client.from("sessions").update(toSessionRow(merged, userId)).eq("id", id).select().single();
        if (error) throw error;
        const session = fromSessionRow(data);
        setCache((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? session : x)) }));
        return session;
      }, "Não foi possível atualizar a sessão."),
    remove: (id) =>
      withErrorToast(async () => {
        const { error } = await client.from("sessions").delete().eq("id", id);
        if (error) throw error;
        setCache((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
          reviews: s.reviews.filter((r) => r.sessionId !== id),
        }));
      }, "Não foi possível excluir a sessão."),
  };

  const blocks: BlockRepo = {
    list: () => cache().blocks,
    get: (id) => cache().blocks.find((b) => b.id === id),
    create: (input) =>
      withErrorToast(async () => {
        const { data, error } = await client.from("blocks").insert(toBlockRow(input, userId)).select().single();
        if (error) throw error;
        const block = fromBlockRow(data);
        setCache((s) => ({ blocks: [...s.blocks, block] }));
        return block;
      }, "Não foi possível salvar o bloco."),
    update: (id, patch) =>
      withErrorToast(async () => {
        const current = cache().blocks.find((b) => b.id === id);
        if (!current) throw new Error(`Block ${id} não encontrado`);
        const merged = { ...current, ...patch };
        const { data, error } = await client.from("blocks").update(toBlockRow(merged, userId)).eq("id", id).select().single();
        if (error) throw error;
        const block = fromBlockRow(data);
        setCache((s) => ({ blocks: s.blocks.map((x) => (x.id === id ? block : x)) }));
        return block;
      }, "Não foi possível atualizar o bloco."),
    remove: (id) =>
      withErrorToast(async () => {
        const { error } = await client.from("blocks").delete().eq("id", id);
        if (error) throw error;
        setCache((s) => ({
          blocks: s.blocks.filter((b) => b.id !== id),
          sessions: s.sessions.map((sess) => (sess.blockId === id ? { ...sess, blockId: null } : sess)),
        }));
      }, "Não foi possível excluir o bloco."),
    createSeries: (input, weeksCount) =>
      withErrorToast(async () => {
        const recurrenceRule = `WEEKLY:${crypto.randomUUID()}`;
        const occurrences = generateWeeklyOccurrences(input.startAt, input.endAt, weeksCount);
        const rows = occurrences.map((occurrence) =>
          toBlockRow({ ...input, startAt: occurrence.startAt, endAt: occurrence.endAt, recurrenceRule }, userId),
        );
        const { data, error } = await client.from("blocks").insert(rows).select();
        if (error) throw error;
        const created = (data ?? []).map(fromBlockRow);
        setCache((s) => ({ blocks: [...s.blocks, ...created] }));
        return created;
      }, "Não foi possível criar a série de blocos."),
    removeSeries: (id, scope) =>
      withErrorToast(async () => {
        const target = cache().blocks.find((b) => b.id === id);
        if (!target) return;

        const idsToRemove =
          scope === "this" || !target.recurrenceRule
            ? [id]
            : cache()
                .blocks.filter(
                  (b) => b.recurrenceRule === target.recurrenceRule && new Date(b.startAt).getTime() >= new Date(target.startAt).getTime(),
                )
                .map((b) => b.id);

        const { error } = await client.from("blocks").delete().in("id", idsToRemove);
        if (error) throw error;
        setCache((s) => ({
          blocks: s.blocks.filter((b) => !idsToRemove.includes(b.id)),
          sessions: s.sessions.map((sess) => (sess.blockId && idsToRemove.includes(sess.blockId) ? { ...sess, blockId: null } : sess)),
        }));
      }, "Não foi possível excluir a série de blocos."),
  };

  async function completeReviewInternal(id: string): Promise<void> {
    const review = cache().reviews.find((r) => r.id === id);
    if (!review) throw new Error(`Review ${id} não encontrada`);

    const completedAt = new Date().toISOString();
    const { data, error } = await client.from("reviews").update({ status: "done", completed_at: completedAt }).eq("id", id).select().single();
    if (error) throw error;
    const updated = fromReviewRow(data);
    setCache((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? updated : r)) }));

    const next = nextReviewStep(review);
    if (next) {
      const { data: nextData, error: nextError } = await client.from("reviews").insert(toReviewRow(next, userId)).select().single();
      if (nextError) throw nextError;
      const nextReview = fromReviewRow(nextData);
      setCache((s) => ({ reviews: [...s.reviews, nextReview] }));
    }
  }

  const reviews: ReviewRepo = {
    list: () => cache().reviews,
    get: (id) => cache().reviews.find((r) => r.id === id),
    create: (input) =>
      withErrorToast(async () => {
        const { data, error } = await client.from("reviews").insert(toReviewRow(input, userId)).select().single();
        if (error) throw error;
        const review = fromReviewRow(data);
        setCache((s) => ({ reviews: [...s.reviews, review] }));
        return review;
      }, "Não foi possível salvar a revisão."),
    update: (id, patch) =>
      withErrorToast(async () => {
        const current = cache().reviews.find((r) => r.id === id);
        if (!current) throw new Error(`Review ${id} não encontrada`);
        const merged = { ...current, ...patch };
        const { data, error } = await client.from("reviews").update(toReviewRow(merged, userId)).eq("id", id).select().single();
        if (error) throw error;
        const review = fromReviewRow(data);
        setCache((s) => ({ reviews: s.reviews.map((x) => (x.id === id ? review : x)) }));
        return review;
      }, "Não foi possível atualizar a revisão."),
    remove: (id) =>
      withErrorToast(async () => {
        const { error } = await client.from("reviews").delete().eq("id", id);
        if (error) throw error;
        setCache((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) }));
      }, "Não foi possível excluir a revisão."),
    complete: (id) => withErrorToast(() => completeReviewInternal(id), "Não foi possível concluir a revisão."),
    skip: (id) =>
      withErrorToast(async () => {
        const { data, error } = await client.from("reviews").update({ status: "skipped" }).eq("id", id).select().single();
        if (error) throw error;
        const review = fromReviewRow(data);
        setCache((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? review : r)) }));
      }, "Não foi possível pular a revisão."),
  };

  const profile: ProfileRepo = {
    get: () => cache().profile,
    update: (patch) =>
      withErrorToast(async () => {
        const merged: Profile = { ...cache().profile, ...patch };
        const { data, error } = await client.from("profiles").update(toProfileRow(merged)).eq("id", userId).select().single();
        if (error) throw error;
        const updated = fromProfileRow(data);
        setCache({ profile: updated });
        return updated;
      }, "Não foi possível salvar o perfil."),
  };

  const notifications: NotificationsRepo = {
    get: () => cache().notificationPrefs,
    update: (patch) =>
      withErrorToast(async () => {
        const { data, error } = await client.from("notification_prefs").update(toNotificationPrefsRow(patch)).eq("user_id", userId).select().single();
        if (error) throw error;
        const prefs = fromNotificationPrefsRow(data);
        setCache({ notificationPrefs: prefs });
        return prefs;
      }, "Não foi possível salvar as preferências de notificação."),
    generateTelegramLinkCode: () =>
      withErrorToast(async () => {
        const code = generateLinkCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { error } = await client.from("telegram_link_codes").insert({ code, user_id: userId, expires_at: expiresAt });
        if (error) throw error;
        return { code, expiresAt };
      }, "Não foi possível gerar o código de vínculo do Telegram."),
    refreshTelegramLink: () =>
      withErrorToast(async () => {
        const { data, error } = await client.from("notification_prefs").select("*").eq("user_id", userId).single();
        if (error) throw error;
        const prefs = fromNotificationPrefsRow(data);
        setCache({ notificationPrefs: prefs });
        return prefs;
      }, "Não foi possível checar o status do vínculo do Telegram."),
    unlinkTelegram: () =>
      withErrorToast(async () => {
        const { data, error } = await client
          .from("notification_prefs")
          .update({ telegram_chat_id: null, channel_telegram: false })
          .eq("user_id", userId)
          .select()
          .single();
        if (error) throw error;
        setCache({ notificationPrefs: fromNotificationPrefsRow(data) });
      }, "Não foi possível desvincular o Telegram."),
    sendTest: (type) =>
      withErrorToast(async () => {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError || !sessionData.session) throw sessionError ?? new Error("Sessão não encontrada.");
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${type}?test=true`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        });
        const bodyText = await res.text();
        const parsed = (() => {
          try {
            return bodyText ? JSON.parse(bodyText) : {};
          } catch {
            return {};
          }
        })();
        if (!res.ok) throw new Error(typeof parsed.error === "string" ? parsed.error : "Não foi possível enviar o teste.");
        return parsed as NotificationTestResult;
      }, "Não foi possível enviar a notificação de teste."),
  };

  const calendarFeed: CalendarFeedRepo = {
    get: () => cache().calendarFeed,
    regenerateToken: () =>
      withErrorToast(async () => {
        const { data, error } = await client
          .from("profiles")
          .update({ calendar_feed_token: crypto.randomUUID() })
          .eq("id", userId)
          .select("calendar_feed_token, calendar_feed_include_reviews")
          .single();
        if (error) throw error;
        const feed = fromCalendarFeedRow(data);
        setCache({ calendarFeed: feed });
        return feed;
      }, "Não foi possível gerar uma nova URL do feed."),
    setIncludeReviews: (value) =>
      withErrorToast(async () => {
        const { data, error } = await client
          .from("profiles")
          .update({ calendar_feed_include_reviews: value })
          .eq("id", userId)
          .select("calendar_feed_token, calendar_feed_include_reviews")
          .single();
        if (error) throw error;
        const feed = fromCalendarFeedRow(data);
        setCache({ calendarFeed: feed });
        return feed;
      }, "Não foi possível salvar a preferência de revisões no feed."),
  };

  return { subjects, topics, annotations, cycle, blocks, sessions, reviews, profile, notifications, calendarFeed };
}
