# FASE 6 — Dashboard com Estatísticas

## Contexto
Fases 1–5 concluídas: há sessões, ciclo e revisões gerando dados. Leia `docs/01-requisitos.md` (RF06).

## Objetivo
Transformar a home (/) em um dashboard completo e bonito com Recharts.

## Tarefas
1. Instalar `recharts`. Criar agregadores puros em `lib/domain/stats.ts` (recebem sessions/reviews, retornam dados prontos para os gráficos — sem lógica dentro dos componentes).
2. **Linha de StatCards**: horas hoje, horas na semana (com Δ% vs. semana anterior), % de acerto geral (últimos 30 dias), 🔥 streak de dias consecutivos (`computeStreak`: dias com ≥1 sessão; hoje sem sessão ainda não quebra o streak).
3. **Gráficos** (cores das matérias da paleta; tooltip estilizado no tema):
   - Barras: horas por matéria, com seletor de período (7d / 30d / 90d / tudo).
   - Barras empilhadas ou área: horas por dia dos últimos 14 dias, empilhado por matéria.
   - Linha dupla: evolução semanal (últimas 12 semanas) de horas e % de acerto (eixo Y duplo).
   - Donut: distribuição por tipo de estudo (teoria/questões/revisão/lei seca/aula).
   - Tabela/lista "desempenho em questões por matéria": questões feitas, acertos, %, com barra de cor (verde ≥80%, âmbar 60–79%, vermelho <60%).
4. **Painel lateral do dashboard**: "Estude agora" (sugestão do ciclo), "Revisões hoje" (contagem + link) e mini-resumo do ciclo (top 3 matérias mais atrasadas).
5. **Countdown da prova**: se `exam_date` estiver definida (adicionar dialog simples de configurações no header: nome do concurso + data da prova, salvo no Repository), mostrar "faltam N dias" no header.
6. Estados vazios elegantes em todos os gráficos (sem dados → ilustração/ícone + CTA "registre sua primeira sessão").

## Testes (TDD)
- **Antes de implementar**: testes Vitest de TODOS os agregadores de `lib/domain/stats.ts` (períodos, semanas ISO, % acerto, dados vazios) e de `computeStreak` (hoje sem sessão não quebra, buracos quebram).
- **Ao final**: `e2e/fase-06-dashboard.spec.ts` — com seed de dados: cards corretos, seletor de período altera gráfico, estados vazios sem crash. Regressão: fases 1–5 verdes.

## Critérios de aceite
- [ ] Todos os cards e gráficos refletem os dados reais do localStorage e atualizam ao registrar sessão.
- [ ] Streak correto (testar: sessões ontem e anteontem, nada hoje → streak 2).
- [ ] Seletor de período altera o gráfico de horas por matéria.
- [ ] % por matéria bate com as sessões de questões registradas.
- [ ] Dashboard responsivo (gráficos empilham no mobile) e sem dados não quebra nada.

## Não fazer
- Supabase (próxima fase).
