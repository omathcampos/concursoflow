# FASE 4 — Registro de Sessões + Cronômetro

## Contexto
Fases 1–3 concluídas. Leia `docs/01-requisitos.md` (RF04). Agora o estudo real é registrado e alimenta o ciclo.

## Objetivo
Registrar sessões de estudo (manual ou via cronômetro), com métricas de questões (Tec Concursos) e teoria (Estratégia), integrando com ciclo e calendário.

## Tarefas
1. **SessionForm** (dialog reutilizável):
   - Campos: matéria*, tópico, tipo*, data/hora início*, duração em minutos*, comentário.
   - Campos condicionais por tipo: `questoes` → total de questões + acertos (mostrar % calculado ao vivo); `teoria`/`aula`/`lei_seca` → páginas lidas (opcional).
   - Checkbox "agendar revisões espaçadas" (default ligado para teoria/aula) — só grava a intenção num campo por enquanto; a lógica vem na fase 5.
   - Validação com Zod (acertos ≤ total, duração > 0).
2. **Cronômetro** (`components/sessions/Timer.tsx`):
   - Widget flutuante global (canto inferior direito, presente em todas as páginas): escolher matéria → start/pause/stop.
   - Persistir estado no localStorage (sobrevive a refresh; calcular tempo decorrido por timestamp, não por setInterval acumulado).
   - Stop → abre SessionForm pré-preenchido com matéria e duração.
   - Título da aba mostra o tempo rodando (`23:41 · Português`).
3. **Página Sessões**: lista agrupada por dia (mais recente primeiro), com badges de tipo, duração, % acerto quando houver; filtros por matéria, tipo e período; editar/excluir; botão "+ Nova sessão".
4. **Integração com o ciclo**: sessão criada soma `duration_min` na entrada da matéria no ciclo ativo (gravar `cycle_id`/`cycle_round` na sessão). Remover o botão temporário "+30min" da fase 2. Progresso do ciclo agora deriva das sessões da rodada atual.
5. **Integração com o calendário**: no popover do bloco, "marcar concluído" abre SessionForm pré-preenchido (matéria, tópico, tipo, horário, duração do bloco) e vincula `block_id`. Bloco com sessão vinculada mostra ✓.
6. Dashboard provisório: card "horas hoje" e "horas na semana" na home (o dashboard completo é a fase 6).

## Testes (TDD)
- **Antes de implementar**: testes Vitest do cálculo de tempo do cronômetro por timestamps (pause/resume, refresh simulado) e da soma/subtração no ciclo ao criar/editar/excluir sessão; validação Zod (acertos > total rejeitado).
- **Ao final**: `e2e/fase-04-sessoes.spec.ts` — sessão manual com questões (% correto), cronômetro start→stop→form pré-preenchido, concluir bloco gera sessão vinculada, filtros. Regressão: fases 1–3 verdes.

## Critérios de aceite
- [ ] Registrar sessão manual e via cronômetro; ambas aparecem na lista e somam no ciclo.
- [ ] Cronômetro sobrevive a refresh e navega entre páginas sem parar.
- [ ] % de acerto calculado corretamente; validação impede acertos > total.
- [ ] Concluir bloco do calendário gera sessão vinculada e o bloco mostra ✓.
- [ ] Excluir sessão subtrai o tempo do ciclo.
- [ ] Filtros da lista funcionam combinados.

## Não fazer
- Lógica de revisões (fase 5). Gráficos (fase 6).
