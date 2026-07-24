# FASE 3 — Calendário com Drag & Drop (núcleo do app)

## Contexto
Fases 1–2 concluídas: shell, matérias e ciclo funcionando com Repository local. Leia `docs/01-requisitos.md` (RF03). Esta é a fase mais complexa de UI — capriche.

## Objetivo
Calendário semanal (principal) e mensal com blocos de estudo remanejáveis por drag & drop.

## Tarefas
1. Instalar `@dnd-kit/core @dnd-kit/modifiers`.
2. **Vista semanal** (`components/calendar/WeekGrid.tsx`):
   - Colunas seg–dom (semana começa segunda, locale pt-BR), linhas de 30min das 05:00 às 24:00.
   - Header com dias (destaque no hoje), navegação ‹ semana › e botão "Hoje".
   - Linha do "agora" (indicador vermelho na hora atual, atualiza a cada minuto).
   - Blocos renderizados com cor da matéria, nome, tipo (badge pequena) e horário; altura proporcional à duração.
3. **Interações**:
   - **Criar**: clicar/arrastar em área vazia abre dialog com horário pré-preenchido: matéria, tópico (opcional, filtrado pela matéria), tipo (teoria/questões/revisão/lei seca/aula), início/fim, recorrência semanal opcional (checkbox "repetir toda {dia}").
   - **Mover**: drag do bloco para outro dia/horário (snap de 30min). Usar @dnd-kit com overlay.
   - **Redimensionar**: alça na borda inferior do bloco (snap 30min, mínimo 30min).
   - **Sobreposição**: usar `detectOverlap` em `lib/domain/blocks.ts`; ao soltar sobre conflito, rejeitar com toast.
   - **Clicar no bloco**: popover com detalhes + ações: editar, excluir, marcar concluído ✓ ou pulado. Concluído fica com opacidade/check; pulado fica hachurado.
   - Blocos recorrentes: gerar ocorrências das próximas 8 semanas ao criar; editar/excluir pergunta "só esta" ou "todas as futuras".
4. **Vista mensal**: grid do mês com dots coloridos por matéria em cada dia + contagem de horas planejadas; clique no dia → navega para a semana.
5. **Mobile** (< 768px): vista semanal vira agenda vertical de um dia (lista de blocos) com swipe/setas entre dias. Drag & drop desabilitado no mobile; editar via dialog.
6. Toggle Semana/Mês no topo da página Calendário (Tabs).

## Testes (TDD)
- **Antes de implementar**: testes Vitest de `detectOverlap` (bordas exatas, contido, parcial, dias diferentes) e da geração de ocorrências recorrentes (8 semanas, virada de mês/ano).
- **Ao final**: `e2e/fase-03-calendario.spec.ts` — criar bloco, mover via drag (usar `dragTo`/mouse do Playwright), redimensionar, rejeição de sobreposição (toast), recorrência, marcar concluído, navegação semana/mês. Regressão: fases 1–2 verdes.

## Critérios de aceite
- [ ] Criar bloco arrastando em célula vazia; aparece imediatamente com a cor da matéria.
- [ ] Arrastar bloco para outro dia/horário persiste após refresh.
- [ ] Redimensionar altera a duração com snap de 30min.
- [ ] Impossível sobrepor dois blocos (toast de erro).
- [ ] Recorrência semanal cria ocorrências nas próximas 8 semanas; "excluir todas as futuras" funciona.
- [ ] Vista mensal e navegação entre semanas corretas (testar virada de mês/ano).
- [ ] Marcar concluído/pulado muda o visual do bloco.
- [ ] Sem lag perceptível ao arrastar (não re-renderizar a grade inteira).
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos antes do PR.

## Não fazer
- Vincular blocos a sessões (fase 4). Revisões no calendário (fase 5).
