// Recebe updates do bot do Telegram (registrado via setWebhook). Trata
// /start CODIGO (vincula a conta) e /stop (desvincula).
//
// Protegida pelo header X-Telegram-Bot-Api-Secret-Token, que o Telegram envia
// em toda chamada de webhook quando `secret_token` é passado no setWebhook.
// Reaproveita o mesmo valor de CRON_SECRET (é só um segredo compartilhado
// opaco — não precisa ser um secret dedicado) pra não pedir mais um valor
// manual ao usuário.
import { isLinkCodeValid } from "../_shared/content.ts";
import { getAdminClient } from "../_shared/db.ts";
import { sendTelegramMessage } from "../_shared/senders.ts";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const update = (await req.json()) as TelegramUpdate;
  const message = update.message;
  if (!message?.text) return new Response("ok");

  const chatId = String(message.chat.id);
  const admin = getAdminClient();

  if (message.text.startsWith("/start")) {
    const code = message.text.replace("/start", "").trim();
    if (!code) {
      await sendTelegramMessage(chatId, "Envie o link com o código gerado na página de Perfil do ConcursoFlow.");
      return new Response("ok");
    }

    const { data: linkCode } = await admin.from("telegram_link_codes").select("*").eq("code", code).maybeSingle();
    if (!linkCode || !isLinkCodeValid(linkCode)) {
      await sendTelegramMessage(chatId, "❌ Código inválido ou expirado. Gere um novo na página de Perfil do ConcursoFlow.");
      return new Response("ok");
    }

    await admin.from("telegram_link_codes").update({ used_at: new Date().toISOString() }).eq("code", code);
    await admin.from("notification_prefs").update({ telegram_chat_id: chatId, channel_telegram: true }).eq("user_id", linkCode.user_id);
    await sendTelegramMessage(chatId, "✅ <b>Conta vinculada!</b> Você vai receber por aqui os lembretes que estiverem habilitados no seu Perfil.");
    return new Response("ok");
  }

  if (message.text.startsWith("/stop")) {
    await admin.from("notification_prefs").update({ telegram_chat_id: null, channel_telegram: false }).eq("telegram_chat_id", chatId);
    await sendTelegramMessage(chatId, "👋 Conta desvinculada. Você não vai mais receber notificações por aqui.");
    return new Response("ok");
  }

  return new Response("ok");
});
