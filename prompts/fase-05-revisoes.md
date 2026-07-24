# FASE 5 — Revisões Espaçadas (24h / 7d / 30d)

## Contexto
Fases 1–4 concluídas. Leia `docs/01-requisitos.md` (RF05). O checkbox "agendar revisões" do SessionForm já existe; agora ele ganha efeito.

## Objetivo
Sistema de revisões espaçadas automático com painel diário e presença no calendário.

## Tarefas
1. **Domínio** (`lib/domain/reviews.ts`, funções puras + testadas manualmente):
   - `scheduleFirstReview(session)`: sessão com opt-in → cria Review step 1 com `due_date = D+1`.
   - `completeReview(review)`: marca done e cria a próxima: step 1 → step 2 (D+7 a partir de hoje), step 2 → step 3 (D+30), step 3 → fim do ciclo.
   - Pular revisão: marca skipped e NÃO agenda a próxima (com undo via toast).
2. **Página Revisões**:
   - Seção "Hoje" e "Atrasadas" (due_date < hoje, destaque âmbar).
   - Card de revisão: matéria (cor), tópico, step (badge "1ª · 24h" / "2ª · 7d" / "3ª · 30d"), dias de atraso se houver, link para a sessão de origem.
   - Ações: "Revisado ✓" (opcionalmente abre SessionForm tipo `revisao` pré-preenchido para registrar o tempo) e "Pular".
   - Seção "Próximas" (7 dias seguintes) colapsada.
3. **Calendário**: faixa "Revisões" no topo de cada coluna de dia da vista semanal mostrando chips das revisões devidas naquele dia (não são blocos com horário; clique → concluir/pular).
4. **Indicadores**: badge com contagem de revisões pendentes de hoje no item "Revisões" da sidebar; card "Revisões hoje: N" na home.

## Testes (TDD)
- **Antes de implementar**: testes Vitest de `scheduleFirstReview` e `completeReview` (D+1/D+7/D+30, step 3 encerra, skip não agenda, atrasos, datas com fuso local).
- **Ao final**: `e2e/fase-05-revisoes.spec.ts` — sessão de teoria gera revisão, aparece em "Hoje"/calendário (mockar relógio do navegador com `page.clock`), concluir gera próxima, pular + undo. Regressão: fases 1–4 verdes.

## Critérios de aceite
- [ ] Sessão de teoria com opt-in gera revisão D+1 automaticamente.
- [ ] Concluir step 1 gera step 2 em D+7; step 3 encerra o ciclo daquela sessão.
- [ ] Atrasadas aparecem destacadas e contam no badge da sidebar.
- [ ] "Revisado ✓" com registro cria sessão tipo `revisao` que soma no ciclo.
- [ ] Chips de revisão aparecem no dia certo do calendário.
- [ ] Pular não agenda próxima; undo do toast restaura.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos antes do PR.

## Não fazer
- Algoritmos adaptativos (Anki/SM-2) — steps fixos por enquanto. Gráficos (fase 6).
