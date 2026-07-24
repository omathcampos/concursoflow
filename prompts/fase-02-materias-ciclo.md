# FASE 2 — Matérias, Tópicos e Ciclo de Estudos

## Contexto
Fase 1 concluída: app Next.js rodando com shell, tema e types. Leia `docs/01-requisitos.md` (RF01, RF02) e `docs/02-arquitetura.md` (Repository Pattern). Dados persistem em localStorage via Zustand.

## Objetivo
CRUD completo de matérias/tópicos e o ciclo de estudos funcional, tudo persistido localmente através da camada Repository.

## Tarefas
1. **Camada de dados**: criar `src/lib/data/repository.ts` (interface) e `src/lib/data/local/` com store Zustand + middleware `persist` (chave `concursoflow-v1`). Expor via hook `useRepo()`. TODA a UI desta fase e das próximas usa só essa interface.
2. **Página Matérias** (RF01):
   - Grid de cards de matéria: nome, cor (dot), peso (estrelas 1–5), nº de tópicos, % de tópicos concluídos.
   - Dialog criar/editar: nome, seletor de cor (paleta de 12), peso. Excluir com confirmação (avisar que remove tópicos/vínculos).
   - Expandir card → lista de tópicos: adicionar inline, alternar status (não iniciado → estudando → concluído) com clique, reordenar (setas ou drag simples), excluir.
3. **Página Ciclo** (RF02):
   - Setup: escolher matérias e definir horas-alvo por matéria (input em horas, salvar em minutos).
   - Board do ciclo: uma linha por matéria com barra de progresso (feito/alvo na rodada atual), cor da matéria. Como ainda não há sessões (fase 4), incluir botão temporário "+30min" por matéria para testar o progresso (remover na fase 4).
   - Card destaque "Estude agora: {matéria}" usando `suggestNextSubject` em `src/lib/domain/cycle.ts`: menor `done/target` ponderado por peso (peso maior = mais prioritária no desempate).
   - Rodada completa (todas ≥100%) → banner de parabéns + botão "Nova rodada" (incrementa `round`, zera progresso da rodada).
4. **Seed de demonstração**: se o storage estiver vazio, botão "carregar dados de exemplo" (5 matérias típicas de concurso: Português, Direito Constitucional, Direito Administrativo, RLM, Informática, com tópicos e um ciclo).

## Testes (TDD — ver docs/02-arquitetura.md)
- **Antes de implementar**: testes Vitest de `suggestNextSubject` (empates, pesos, ciclo vazio, todas 100%) e do `LocalRepository` (CRUD + persistência mockada).
- **Ao final**: `e2e/fase-02-materias-ciclo.spec.ts` — criar matéria com cor/peso, adicionar tópicos e alternar status, montar ciclo, ver progresso e sugestão, nova rodada. Regressão: e2e da fase 1 verde.

## Critérios de aceite
- [ ] Criar, editar e excluir matéria e tópicos; tudo sobrevive a refresh (localStorage).
- [ ] Ciclo mostra progresso correto e sugere a matéria certa (testar: matéria com 0% e peso 5 vence matéria com 0% e peso 1).
- [ ] Nova rodada zera barras e incrementa o número da rodada.
- [ ] Nenhum componente importa Zustand/localStorage diretamente — só via `useRepo()`.
- [ ] Sem erros de TypeScript.

## Não fazer
- Calendário, sessões reais, Supabase.
