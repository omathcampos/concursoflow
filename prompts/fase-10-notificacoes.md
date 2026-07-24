# FASE 10 — Notificações: Email + Telegram (lembretes e relatórios)

## Contexto
Fases 0–9 concluídas: app em produção com Supabase + Auth. Leia `docs/02-arquitetura.md`. Canais: **email via Resend** e **Telegram bot**. Infra: **pg_cron** agenda → **Edge Functions** montam o conteúdo (uma vez) → enviam pelos canais habilitados do usuário. A montagem do conteúdo é compartilhada; cada canal é só um "sender" (`senders/email.ts`, `senders/telegram.ts`).

> ⚠️ Todas as operações Supabase usam **exclusivamente a ref do projeto criado na fase 7**. Não tocar em `bjglagkkodzlzlbnpwgp`, `pzxwxrxocksfknvqcmnu`, `yvjjatlindmruqmlmqpg`. Confirmar a ref com o usuário antes da primeira operação.

## Objetivo
Três envios automáticos — lembrete diário de manhã, relatório semanal e alerta de revisões atrasadas — por email e/ou Telegram, com preferências por usuário e opt-out.

## Tarefas
1. **Resend**: criar conta/API key (usuário faz manualmente e fornece a key). Guardar como secret da Edge Function (`supabase secrets set RESEND_API_KEY=...`), nunca no repo. Enquanto não houver domínio próprio verificado, usar o domínio de teste do Resend (`onboarding@resend.dev`) e documentar a limitação (só envia para o email da conta Resend).
2. **Telegram bot**: criar via @BotFather (usuário faz manualmente, ex.: `@ConcursoFlowBot`) e fornecer o token → secret `TELEGRAM_BOT_TOKEN`. Vínculo de conta:
   - UI de preferências gera código curto de uso único (tabela `telegram_link_codes`: code, user_id, expires_at 10min) e mostra link `t.me/ConcursoFlowBot?start=CODIGO`.
   - Edge Function `telegram-webhook` (registrada via `setWebhook`, protegida por `secret_token` do Telegram): recebe `/start CODIGO` → valida código → salva `chat_id` em `notification_prefs.telegram_chat_id` → responde confirmação. Comando `/stop` desvincula.
   - Envio: `sendMessage` com `parse_mode: HTML` (versão compacta do conteúdo — Telegram é mensagem, não email: sem tabelas grandes, usar emojis e negrito).
3. **Migration — preferências e log**:
   - `notification_prefs`: user_id (pk, fk auth.users), daily_enabled (default true), daily_hour (default 7), weekly_enabled (default true), overdue_enabled (default true), channel_email (default true), channel_telegram (default false), telegram_chat_id (nullable), timezone (default 'America/Sao_Paulo'), unsubscribe_token uuid. RLS: cada usuário só a própria linha; criar junto com o profile no trigger `handle_new_user`.
   - `notification_log`: id, user_id, type ('daily'|'weekly'|'overdue'), channel ('email'|'telegram'), sent_at, status — para idempotência (não enviar 2x no mesmo dia por canal) e debug.
4. **Edge Functions** (Deno, uma por tipo ou uma com router `?type=`; após montar o conteúdo, despachar para os senders dos canais habilitados do usuário):
   - `daily`: busca usuários com daily_enabled e hora local == daily_hour → para cada um: blocos de hoje + revisões pendentes → se houver conteúdo, envia. Dia sem nada agendado: não envia (sem spam).
   - `weekly`: domingos ~20h local → horas da semana vs. anterior (Δ%), horas por matéria, % de acerto, streak, top 3 matérias atrasadas no ciclo. Reusar a lógica dos agregadores portando o essencial de `lib/domain/stats.ts` para a function (ou duplicar de forma mínima e documentada).
   - `overdue`: diário ~12h → usuários com revisões vencidas há 2+ dias → alerta com lista. Máximo 1 alerta a cada 3 dias por usuário (checar `notification_log`).
   - Auth: functions protegidas por secret próprio (`CRON_SECRET`) passado pelo pg_cron via header — não expor publicamente.
5. **pg_cron + pg_net**: habilitar extensões; jobs de hora em hora chamando `daily` (a function filtra pela hora local de cada usuário — cobre fusos), diário 23h UTC para `weekly` (function confere se é domingo no fuso do usuário) e diário 15h UTC para `overdue`.
6. **Templates de email**: HTML responsivo com a identidade do app (roxo/zinc, logo texto), versão texto-puro junto. Rodapé com link de descadastro: rota pública `/unsubscribe?token=...` que desliga a preferência correspondente sem exigir login (via unsubscribe_token).
7. **UI de preferências**: seção "Notificações" na página de perfil — toggles dos 3 tipos, canais (email/Telegram), horário do lembrete diário (select), timezone. Card do Telegram: status (vinculado/não), botão "Vincular Telegram" (gera código + link t.me) e "Desvincular". Salvar em `notification_prefs`.
8. **Teste manual**: botão "enviar agora (teste)" na UI de preferências (chama a function com flag de teste, envia pelos canais habilitados só para o próprio usuário).

## Testes (TDD)
- **Antes de implementar**: testes Vitest das funções puras de montagem de conteúdo (estrutura única → renderizadores email HTML e Telegram HTML compacto; casos: dia vazio, semana sem estudo, sem atrasadas → não envia), da idempotência/rate-limit por canal e da validação de códigos de vínculo (expirado, reusado, inválido).
- **Ao final**: e2e da UI de preferências (toggles, fluxo de vincular mostra código/link, botão de teste dispara com feedback) + teste manual real dos 3 envios nos 2 canais (Gmail e Telegram). Regressão: suíte completa verde.

## Critérios de aceite
- [ ] Lembrete diário chega no horário configurado, com blocos e revisões do dia; dia vazio não gera email.
- [ ] Relatório semanal chega domingo com números corretos (conferir contra o dashboard).
- [ ] Alerta de atrasadas respeita o limite de 1 a cada 3 dias e some quando o usuário zera as revisões.
- [ ] `notification_log` impede envio duplicado (rodar o job 2x no mesmo dia → 1 email).
- [ ] Link de descadastro funciona sem login e desliga só o tipo certo.
- [ ] Vínculo do Telegram: `/start CODIGO` vincula (código expirado/reusado falha com mensagem clara), `/stop` desvincula, mensagens chegam formatadas.
- [ ] Usuário com os 2 canais recebe nos 2; com Telegram sem chat_id vinculado, cai só no email (sem erro).
- [ ] Nenhum secret no repo; RLS ativa nas tabelas novas; advisors sem alertas críticos.
- [ ] Nenhuma operação tocou os projetos Supabase proibidos.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos antes do PR (lint cobrindo também o código das Edge Functions).

## Não fazer
- WhatsApp/push (podem virar fase futura). Domínio de email próprio (opcional, documentar como upgrade). Comandos ricos no bot além de /start e /stop (consultas pelo bot podem virar feature futura).
