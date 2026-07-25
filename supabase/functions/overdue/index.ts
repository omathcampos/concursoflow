// Alerta de revisões atrasadas (2+ dias). Cron (diário ~15h UTC) ou teste
// manual (JWT do próprio usuário + ?test=true). No máximo 1 alerta a cada 3
// dias por usuário/canal (checa notification_log).
import { buildOverdueContent, getLocalBounds } from "../_shared/build-content.ts";
import { renderOverdueEmailHtml, renderOverdueEmailText, renderOverdueTelegramHtml, shouldSendOverdue } from "../_shared/content.ts";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { getAdminClient, getUserFromAuthHeader, isCronAuthorized } from "../_shared/db.ts";
import { sendEmail, sendTelegramMessage } from "../_shared/senders.ts";
import type { NotificationPrefsRow } from "../_shared/types.ts";

const SITE_URL = "https://concursoflow-alpha.vercel.app";
const MIN_INTERVAL_DAYS = 3;

async function canSendNow(admin: ReturnType<typeof getAdminClient>, userId: string, channel: "email" | "telegram"): Promise<boolean> {
  const { data } = await admin
    .from("notification_log")
    .select("sent_at")
    .eq("user_id", userId)
    .eq("type", "overdue")
    .eq("channel", channel)
    .order("sent_at", { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return true;
  const daysSince = (Date.now() - new Date(data[0].sent_at).getTime()) / 86_400_000;
  return daysSince >= MIN_INTERVAL_DAYS;
}

async function processUser(admin: ReturnType<typeof getAdminClient>, prefs: NotificationPrefsRow, isTest: boolean, now: Date) {
  const bounds = await getLocalBounds(admin, prefs.timezone, now);
  const content = await buildOverdueContent(admin, prefs.user_id, bounds);
  if (!isTest && !shouldSendOverdue(content)) return { skipped: "empty" };

  const { data: profile } = await admin.from("profiles").select("display_name").eq("id", prefs.user_id).single();
  const displayName = profile?.display_name ?? null;
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${prefs.unsubscribe_token}&type=overdue`;

  const results: Record<string, string> = {};

  if (prefs.channel_email && (isTest || (await canSendNow(admin, prefs.user_id, "email")))) {
    const { data: authUser } = await admin.auth.admin.getUserById(prefs.user_id);
    const email = authUser?.user?.email;
    if (email) {
      await sendEmail(
        email,
        "⏰ Revisões atrasadas no ConcursoFlow",
        renderOverdueEmailHtml(content, displayName, unsubscribeUrl),
        renderOverdueEmailText(content, displayName),
      );
      if (!isTest) await admin.from("notification_log").insert({ user_id: prefs.user_id, type: "overdue", channel: "email", status: "sent" });
      results.email = "sent";
    }
  }

  if (prefs.channel_telegram && prefs.telegram_chat_id && (isTest || (await canSendNow(admin, prefs.user_id, "telegram")))) {
    await sendTelegramMessage(prefs.telegram_chat_id, renderOverdueTelegramHtml(content));
    if (!isTest) await admin.from("notification_log").insert({ user_id: prefs.user_id, type: "overdue", channel: "telegram", status: "sent" });
    results.telegram = "sent";
  }

  return results;
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";
  const admin = getAdminClient();
  const now = new Date();

  if (isTest) {
    const user = await getUserFromAuthHeader(req.headers.get("authorization"));
    if (!user) return corsJson({ error: "unauthorized" }, 401);

    const { data: prefs } = await admin.from("notification_prefs").select("*").eq("user_id", user.id).single();
    if (!prefs) return corsJson({ error: "prefs not found" }, 404);

    try {
      const result = await processUser(admin, prefs as NotificationPrefsRow, true, now);
      return corsJson(result);
    } catch (err) {
      return corsJson({ error: String(err instanceof Error ? err.message : err) }, 500);
    }
  }

  if (!isCronAuthorized(req)) return corsJson({ error: "unauthorized" }, 401);

  const { data: allPrefs } = await admin.from("notification_prefs").select("*").eq("overdue_enabled", true);
  const results = [];
  for (const prefs of (allPrefs ?? []) as NotificationPrefsRow[]) {
    try {
      results.push({ user_id: prefs.user_id, ...(await processUser(admin, prefs, false, now)) });
    } catch (err) {
      results.push({ user_id: prefs.user_id, error: String(err) });
    }
  }
  return corsJson({ processed: results.length, results });
});
