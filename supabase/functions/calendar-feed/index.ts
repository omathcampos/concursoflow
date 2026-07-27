// Pública (verify_jwt: false) — feed iCal (.ics) de assinatura, identificado
// pelo calendar_feed_token do perfil (não pelo JWT). Aceita o token via
// query string (?token=) ou como último segmento do path (/calendar-feed/
// <token>.ics), pra funcionar tanto colado direto quanto salvo com extensão
// .ics por clientes mais exigentes.
import { buildICalFeed, filterBlocksForFeed, type ICalBlock, type ICalReview, type ICalSubject } from "../_shared/ical.ts";
import { getAdminClient } from "../_shared/db.ts";

function extractToken(url: URL): string | null {
  const queryToken = url.searchParams.get("token");
  if (queryToken) return queryToken;

  const lastSegment = url.pathname.split("/").filter(Boolean).pop();
  if (!lastSegment) return null;
  return lastSegment.endsWith(".ics") ? lastSegment.slice(0, -4) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(req.url);
  const token = extractToken(url);
  if (!token) return new Response("Not Found", { status: 404 });

  const admin = getAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, display_name, calendar_feed_include_reviews")
    .eq("calendar_feed_token", token)
    .maybeSingle();

  // 22P02 = "invalid input syntax for type uuid" — token mal formado, mesmo tratamento que token inexistente.
  if ((profileError && profileError.code !== "22P02") || !profile) {
    return new Response("Not Found", { status: 404 });
  }

  const now = new Date();

  const [blocksRes, subjectsRes, reviewsRes] = await Promise.all([
    admin
      .from("blocks")
      .select("id, subject_id, type, status, start_at, end_at, notes, topics(name)")
      .eq("user_id", profile.id),
    admin.from("subjects").select("id, name").eq("user_id", profile.id),
    profile.calendar_feed_include_reviews
      ? admin.from("reviews").select("id, subject_id, due_date").eq("user_id", profile.id).eq("status", "pending")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (blocksRes.error || subjectsRes.error || reviewsRes.error) {
    return new Response("Internal Server Error", { status: 500 });
  }

  type BlockRow = {
    id: string;
    subject_id: string;
    type: ICalBlock["type"];
    status: ICalBlock["status"];
    start_at: string;
    end_at: string;
    notes: string | null;
    topics: { name: string } | null;
  };

  const blocks: ICalBlock[] = ((blocksRes.data ?? []) as unknown as BlockRow[]).map((b) => ({
    id: b.id,
    subjectId: b.subject_id,
    topicName: b.topics?.name ?? null,
    type: b.type,
    status: b.status,
    startAt: b.start_at,
    endAt: b.end_at,
    notes: b.notes,
  }));

  const subjects: ICalSubject[] = ((subjectsRes.data ?? []) as Array<{ id: string; name: string }>).map((s) => ({ id: s.id, name: s.name }));

  const reviews: ICalReview[] = ((reviewsRes.data ?? []) as Array<{ id: string; subject_id: string; due_date: string }>).map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    dueDate: r.due_date,
  }));

  const ics = buildICalFeed(filterBlocksForFeed(blocks, now), subjects, {
    calName: profile.display_name ? `ConcursoFlow — ${profile.display_name}` : "ConcursoFlow",
    reviews: profile.calendar_feed_include_reviews ? reviews : undefined,
    now,
  });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="concursoflow.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
});
