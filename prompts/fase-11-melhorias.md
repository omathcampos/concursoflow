# FASE 11 — Melhorias: Anotações, Observações e Modo Foco

## Contexto
Fases 0–10 concluídas. Esta fase agrupa melhorias definidas durante o desenvolvimento (leia RF09 em `docs/01-requisitos.md`). O schema já tem a tabela `annotations` e as colunas `notes` em subjects/topics (criadas na migration inicial da fase 7 — conferir; se o banco foi criado antes dessas colunas, criar migration nova e registrar no `MIGRATIONS.md`).

> ⚠️ Operações Supabase apenas na ref `apceuvnqnrxfoongjvxq` (projeto ConcursoFlow).

## Objetivo
Caderno de anotações em markdown, campos de observações em matérias/tópicos e modo foco em tela cheia para o cronômetro.

## Tarefas
1. **Types + Repository**: adicionar `Annotation` em `types.ts` e `notes` em Subject/Topic; estender a interface `Repository` (annotations CRUD) nas duas implementações (local e Supabase).
2. **Observações**:
   - Dialog da matéria: campo observações (textarea).
   - Tópicos: ícone de nota abre popover com textarea; tópico com observação mostra ícone preenchido.
3. **Página Anotações** (RF09) + link "Anotações" na sidebar (ícone lucide):
   - Layout duas colunas (desktop): lista à esquerda (título, matéria com dot de cor, data de edição; busca por texto e filtro por matéria), editor à direita. Mobile: lista → tela de edição.
   - Editor: título + conteúdo markdown com preview (tabs Escrever/Visualizar; `react-markdown`). Autosave com debounce.
   - Anotação avulsa ou vinculada a matéria e/ou tópico (selects opcionais).
   - Atalhos: "nova anotação" no card da matéria e no popover do bloco do calendário (já vinculada).
4. **Modo foco do cronômetro**: botão expandir no widget → overlay fullscreen (Fullscreen API, fallback overlay na viewport): tempo gigante centralizado (fonte tabular), nome e cor da matéria, controles pause/stop discretos, fundo sem distrações. ESC/minimizar volta ao widget sem interromper a contagem. Mobile: Wake Lock API mantém a tela ligada no modo foco.

## Testes (TDD)
- **Antes de implementar**: testes Vitest do repositório de annotations (CRUD, filtros, busca) e da lógica de autosave/debounce.
- **Ao final**: `e2e/fase-11-melhorias.spec.ts` — criar anotação vinculada, buscar, editar com preview; observação em matéria e tópico persiste; modo foco entra/sai sem perder contagem. Regressão: suíte completa verde.

## Critérios de aceite
- [ ] Anotações: criar/editar/excluir com markdown no preview; busca e filtro funcionam; autosave não perde conteúdo ao navegar; RLS isola por usuário.
- [ ] Observações em matérias e tópicos persistem (verificar no Supabase).
- [ ] Atalhos do card da matéria e do popover do bloco criam anotação já vinculada.
- [ ] Modo foco: tempo legível de longe, entrar/sair sem perder contagem, Wake Lock no mobile.
- [ ] Migration nova (se necessária) registrada no `MIGRATIONS.md`.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos antes do PR.
