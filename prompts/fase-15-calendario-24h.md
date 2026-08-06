# FASE 15 — Calendário 24h + sessões avulsas no calendário

## Contexto
App em produção. Leia o `CLAUDE.md` e siga todas as regras de lá (Repository/cache, TDD, Git Flow, lint+tsc+test+e2e antes do PR). Release: bump minor. Sem migration prevista.

> ⚠️ Operações Supabase (se houver) apenas na ref `apceuvnqnrxfoongjvxq`.

## Objetivo
Duas melhorias de UX no calendário: (A) grade de 24h estilo Google Calendar, sem a limitação atual de 05h–24h; (B) sessões avulsas (estudo extra registrado fora de bloco) visíveis no calendário.

## Tarefas

### A) Grade 24h
1. Vista semanal passa a renderizar 00h00–24h00 completa (remover `DAY_START_HOUR`/limite atual).
2. **Auto-scroll inteligente** (o pulo do gato do Google Calendar): ao abrir, a grade rola automaticamente para ~1h antes do primeiro bloco do dia (ou para a hora atual, o que for menor) — nunca começar mostrando madrugada vazia.
3. Linha do "agora" continua funcionando em qualquer horário; navegação entre semanas preserva a posição de scroll.
4. Criar/mover/redimensionar blocos funciona em qualquer horário das 24h (incluindo madrugada); performance da grade não pode degradar (são ~2x mais células — virtualizar ou manter render leve).
5. Vista de agenda mobile idem: dia completo com scroll.

### B) Sessões avulsas no calendário
1. Sessões SEM `block_id` (registro manual ou cronômetro fora de bloco) aparecem na grade como um "bloco de sessão" no horário real (`started_at` + duração), com visual claramente distinto dos blocos planejados: mesma cor da matéria porém estilo "realizado" (ex.: preenchimento sólido mais suave + borda tracejada + ícone ✓ pequeno), para não confundir plano com execução.
2. **Arrastáveis para corrigir horário**: drag da sessão avulsa move o `started_at` (mesmo snap dos blocos); resize pela borda ajusta a duração — útil quando o registro manual saiu com hora errada. Sem passar pelo detectOverlap (sessão não é planejamento). Clique abre popover com detalhes (matéria, tipo, duração, questões/acertos, comentário) e ações editar (SessionForm completo) / excluir. Atenção: mudar a duração pelo resize deve refletir no progresso do ciclo e no dashboard (mesma regra de editar a sessão pelo form).
3. Sessões vinculadas a bloco NÃO ganham item próprio (o bloco concluído já as representa) — sem duplicação visual.
4. Overlap visual: sessão avulsa pode coexistir com blocos no mesmo horário — renderizar lado a lado (split de largura na célula), sem passar pelo detectOverlap (sessão não é planejamento).
5. Toggle "mostrar sessões realizadas" no header do calendário (default ligado, persistir preferência).

## Testes (TDD)
- **Antes**: Vitest da lógica de auto-scroll (primeiro bloco vs. hora atual, dia vazio) e do posicionamento/particionamento visual sessão×bloco no mesmo horário.
- **Ao final**: `e2e/fase-15-calendario-24h.spec.ts` — grade mostra 24h, auto-scroll posiciona certo, criar bloco às 02h funciona, sessão avulsa aparece no horário certo com estilo distinto, toggle esconde/mostra, sessão vinculada a bloco não duplica. Regressão: suíte completa verde (especialmente os e2e de calendário das fases 3/12).

## Critérios de aceite
- [ ] Grade 24h com auto-scroll inteligente; nenhuma regressão de drag/resize/recorrência.
- [ ] Sem lag perceptível com a grade completa.
- [ ] Sessões avulsas visíveis no horário real, estilo distinto, sem duplicar as vinculadas a bloco; arrastar corrige o horário e o resize ajusta a duração refletindo no ciclo/dashboard.
- [ ] Toggle persiste; feed iCal (fase 12) NÃO passa a incluir sessões (só blocos — validar).
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos; release minor via Git Flow.
