# FASE 14 — Exportar dados para planilha (.xlsx / .csv)

## Contexto
App completo em produção. Leia o `CLAUDE.md` do repo e siga todas as regras de lá. Release: bump minor.

> ⚠️ Operações Supabase (se houver) apenas na ref `apceuvnqnrxfoongjvxq`. Esta fase não deve precisar de migration — é exportação 100% client-side dos dados que o cache já tem.

## Objetivo
Botão "Exportar dados" que gera um **.xlsx** (multi-abas, formatado) ou **.csv** com os dados de estudo do usuário, gerado no client (sem backend novo).

## Decisão de arquitetura
- Geração no client com **SheetJS (xlsx)** via dynamic import (não entrar no bundle das outras páginas). CSV como alternativa (uma entidade por arquivo).
- Dados lidos EXCLUSIVAMENTE via `useRepo()`/cache — nenhuma query nova ao Supabase.
- Montagem dos dados como funções puras TDD em `lib/domain/export.ts` (recebem sessions/subjects/etc., retornam matrizes linha×coluna prontas — a UI só passa pro SheetJS).

## Escopo do arquivo .xlsx (abas)
1. **Resumo** — período exportado, total de horas, sessões, % de acerto geral, streak atual; tabela por matéria: horas, nº sessões, questões feitas/acertos/%, horas-alvo e % do ciclo na rodada atual.
2. **Sessões** — uma linha por sessão: data, hora, matéria, tópico, tipo, duração (min), questões feitas, acertos, % acerto, páginas, comentário.
3. **Blocos** — data, horário início/fim, matéria, tópico, tipo, status (planejado/concluído/pulado), recorrente (sim/não).
4. **Revisões** — matéria, tópico, etapa (24h/7d/30d), data prevista, status, data de conclusão, dias de atraso.
5. **Evolução semanal** — uma linha por semana: horas totais, horas por matéria (colunas), questões, % acerto.

Formatação mínima: cabeçalhos em negrito com filtro automático, larguras razoáveis, datas como data de verdade (não texto), % como percentual. Nomes de abas e cabeçalhos em pt-BR.

## UI
- Dialog "Exportar dados" acessível do Dashboard (e/ou menu do usuário): seletor de período (últimos 30d / 90d / tudo / intervalo custom), formato (.xlsx ou .csv), checkboxes de quais abas incluir. Nome do arquivo: `concursoflow-export-AAAA-MM-DD.xlsx`.
- Funciona também em modo `local` (dados do localStorage) — não depende de login no Supabase para gerar.

## Testes (TDD)
- **Antes**: Vitest de `lib/domain/export.ts` — matrizes corretas para cada aba (casos: sem dados, sessão sem questões, % com divisão por zero, semanas ISO na virada de ano, filtro de período).
- **Ao final**: `e2e/fase-14-export.spec.ts` — dialog abre, download dispara e o arquivo baixado é um xlsx válido com as abas certas (validar no teste com o próprio SheetJS lendo o arquivo). Regressão: suíte completa verde.

## Critérios de aceite
- [ ] .xlsx abre no Excel/Google Sheets/LibreOffice com as 5 abas, cabeçalhos e formatação corretos, acentos ok.
- [ ] Números batem com o dashboard (conferir horas e % de acerto de uma matéria manualmente).
- [ ] Seletor de período filtra corretamente; .csv gera arquivos válidos.
- [ ] SheetJS carregado só sob demanda (verificar no bundle/network).
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos; release minor via Git Flow.
