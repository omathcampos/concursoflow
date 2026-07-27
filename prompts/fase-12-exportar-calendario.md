# FASE 12 — Exportar calendário (Google Agenda / Apple Calendar via feed iCal)

## Contexto
App completo em produção (v1.3.x). Leia o `CLAUDE.md` do repo e siga TODAS as regras de lá (Repository Pattern, leitura síncrona via cache, TDD, Git Flow, migrations em `MIGRATIONS.md`, tokens de tema, Base UI). Release desta fase: bump **minor**.

> ⚠️ Operações Supabase apenas na ref `apceuvnqnrxfoongjvxq` (projeto ConcursoFlow). Nunca tocar em `bjglagkkodzlzlbnpwgp`, `pzxwxrxocksfknvqcmnu`, `yvjjatlindmruqmlmqpg`.

## Objetivo
Cada usuário ganha uma URL secreta de feed iCalendar (.ics) com seus blocos de estudo, que Google Agenda, Apple Calendar e Outlook assinam nativamente (atualização automática). Exportação one-way (app → agenda); sem OAuth, sem API do Google.

## Decisão de arquitetura
- **Feed por assinatura (principal)**: endpoint público autenticado por token — Edge Function (ou route handler Next) `GET /calendar/:token.ics` retornando `text/calendar`.
- **Download avulso (bônus barato)**: botão "Baixar .ics" na página Calendário gera o arquivo do período visível no client.
- Sync bidirecional via Google Calendar API: FORA de escopo (documentar como possível fase futura).

## Tarefas
1. **Migration** (`supabase migration new calendar_feed` + linha no `MIGRATIONS.md`): coluna `calendar_feed_token uuid unique default uuid_generate_v4()` em `profiles` (ou tabela própria se preferir rotação com histórico). Índice para lookup por token. RLS: o endpoint usa service role no servidor com lookup EXCLUSIVAMENTE pelo token — validar que token inexistente retorna 404 sem vazar nada.
2. **Domínio TDD — `lib/domain/ical.ts`** (função pura, testes ANTES):
   - `buildICalFeed(blocks, subjects, opts)` → string .ics válida (RFC 5545): `VCALENDAR` com `PRODID`/`VERSION`, `X-WR-CALNAME: ConcursoFlow`, um `VEVENT` por bloco com `UID` estável (id do bloco), `DTSTART`/`DTEND` com `TZID:America/Sao_Paulo` (ou timezone do usuário — incluir `VTIMEZONE`), `SUMMARY` = "{emoji do tipo} {matéria} — {tópico?}", `DESCRIPTION` = tipo + notas, `STATUS`/`CATEGORIES` refletindo planejado/concluído/pulado, `LAST-MODIFIED`.
   - Cuidados testados: escaping de vírgula/ponto-e-vírgula/quebra de linha, line folding em 75 octetos, CRLF, datas na virada de mês/ano, bloco sem tópico.
   - Janela do feed: blocos de -30 dias a +90 dias (não mandar a vida inteira).
   - Opcional dentro da mesma função: incluir revisões pendentes como eventos all-day (flag `includeReviews`).
3. **Endpoint do feed**: `GET` público por token (sem sessão) → busca profile pelo token → monta blocos da janela → responde `text/calendar; charset=utf-8` com `Content-Disposition` inline e cache curto (`Cache-Control: max-age=300`). Token inválido → 404 genérico. Rate-limit básico (mesmo padrão das functions da fase 10).
4. **UI — página Calendário, dialog "Exportar"** (botão com ícone calendar-plus no header da página):
   - Mostra a URL do feed com botão copiar (e QR code se trivial), instruções curtas por plataforma: Google Agenda (Configurações → Adicionar agenda → Por URL), Apple Calendar (Arquivo → Nova assinatura de calendário / Ajustes no iOS), Outlook.
   - Aviso: "quem tiver esta URL vê seu cronograma" + botão **regenerar token** (invalida a URL antiga, com confirmação).
   - Toggle "incluir revisões" (persistir preferência).
   - Botão "Baixar .ics" do período visível.
   - Nota de expectativa: Google/Apple atualizam feeds assinados a cada algumas horas (não é tempo real) — deixar isso escrito no dialog.
5. **Validação real**: assinar o feed de teste no Google Agenda e no Apple Calendar e conferir: eventos certos, horários certos (fuso!), acentos ok, bloco movido no app some do horário antigo na próxima atualização do feed.

## Testes (TDD)
- **Antes**: suite Vitest de `buildICalFeed` cobrindo os casos da tarefa 2 (validar contra parser ical em dev, ex.: `node-ical`, como dev-dependency de teste).
- **Ao final**: `e2e/fase-12-exportar.spec.ts` — dialog abre, URL copiável, regenerar token muda a URL, download .ics baixa arquivo válido; requisição HTTP ao endpoint com token válido retorna 200 text/calendar e com token inválido 404. Regressão: suíte completa verde.

## Critérios de aceite
- [ ] Feed assinado no Google Agenda E no Apple Calendar exibe os blocos com matéria, tipo e horário corretos (fuso conferido manualmente).
- [ ] Bloco criado/movido/excluído no app reflete no feed (validar refazendo o fetch da URL).
- [ ] Regenerar token: URL antiga passa a retornar 404.
- [ ] `.ics` baixado abre no Google/Apple sem erro de importação.
- [ ] Migration registrada no `MIGRATIONS.md`; nenhum secret/token em arquivo versionado.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos; release minor via Git Flow.
