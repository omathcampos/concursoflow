// Lembrete diário. Cron (hora em hora, filtra pela hora local de cada
// usuário) ou teste manual (JWT do próprio usuário + ?test=true).
import { buildDailyContent, getLocalBounds } from "../_shared/build-content.ts";
import { renderDailyEmailHtml, renderDailyEmailText, renderDailyTelegramHtml, shouldSendDaily } from "../_shared/content.ts";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";
import { getAdminClient, getUserFromAuthHeader, isCronAuthorized } from "../_shared/db.ts";
import { sendEmail, sendTelegramMessage } from "../_shared/senders.ts";
import type { NotificationPrefsRow } from "../_shared/types.ts";

const SITE_URL = "https://concursoflow-alpha.vercel.app";

async function canSendToday(admin: ReturnType<typeof getAdminClient>, userId: string, channel: "email" | "telegram"): Promise<boolean> {
  const { data } = await admin
    .from("notification_log")
    .select("sent_at")
    .eq("user_id", userId)
    .eq("type", "daily")
    .eq("channel", channel)
    .order("sent_at", { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return true;
  const lastSentDate = new Date(data[0].sent_at).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return lastSentDate !== today;
}

async function processUser(admin: ReturnType<typeof getAdminClient>, prefs: NotificationPrefsRow, isTest: boolean, now: Date) {
  const bounds = await getLocalBounds(admin, prefs.timezone, now);
  if (!isTest && bounds.local_hour !== prefs.daily_hour) return { skipped: "hour" };

  const content = await buildDailyContent(admin, prefs.user_id, prefs.timezone, bounds);
  if (!isTest && !shouldSendDaily(content)) return { skipped: "empty" };

  const { data: profile } = await admin.from("profiles").select("display_name").eq("id", prefs.user_id).single();
  const displayName = profile?.display_name ?? null;
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${prefs.unsubscribe_token}&type=daily`;

  const results: Record<string, string> = {};

  if (prefs.channel_email && (isTest || (await canSendToday(admin, prefs.user_id, "email")))) {
    const { data: authUser } = await admin.auth.admin.getUserById(prefs.user_id);
    const email = authUser?.user?.email;
    if (email) {
      await sendEmail(email, "☀️ Seu dia no ConcursoFlow", renderDailyEmailHtml(content, displayName, unsubscribeUrl), renderDailyEmailText(content, displayName));
      if (!isTest) await admin.from("notification_log").insert({ user_id: prefs.user_id, type: "daily", channel: "email", status: "sent" });
      results.email = "sent";
    }
  }

  if (prefs.channel_telegram && prefs.telegram_chat_id && (isTest || (await canSendToday(admin, prefs.user_id, "telegram")))) {
    await sendTelegramMessage(prefs.telegram_chat_id, renderDailyTelegramHtml(content));
    if (!isTest) await admin.from("notification_log").insert({ user_id: prefs.user_id, type: "daily", channel: "telegram", status: "sent" });
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

    const result = await processUser(admin, prefs as NotificationPrefsRow, true, now);
    return corsJson(result);
  }

  if (!isCronAuthorized(req)) return corsJson({ error: "unauthorized" }, 401);

  const { data: allPrefs } = await admin.from("notification_prefs").select("*").eq("daily_enabled", true);
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
