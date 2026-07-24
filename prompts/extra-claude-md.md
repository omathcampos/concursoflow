# EXTRA — Criar um CLAUDE.md excelente

> Execute a qualquer momento (ideal: agora, antes da fase 7). Não é uma fase — não precisa de branch/PR próprio; pode entrar no próximo PR ou direto em develop se as proteções permitirem via PR rápido.

## Contexto
Projeto **ConcursoFlow** em desenvolvimento com Claude Code. Leia: `PLANO.md`, `docs/01-requisitos.md`, `docs/02-arquitetura.md` e o código já existente. O objetivo é que qualquer sessão futura do Claude Code entenda o projeto e suas regras SEM precisar reler tudo.

## Objetivo
Criar um `CLAUDE.md` na raiz, conciso porém completo (alvo: ~80–120 linhas — é lido em toda sessão, não pode ser um romance).

## O CLAUDE.md deve conter

1. **Visão em 3 linhas**: o que é o app, stack (Next.js 15 + TS + Tailwind v4 + shadcn/ui + Zustand + Supabase), estado atual (qual fase concluída).
2. **Comandos**: `npm run dev`, `lint`, `test`, `test:watch`, `e2e`, `build` — e a regra: **lint + tsc + test + e2e limpos antes de qualquer commit/PR**.
3. **Arquitetura essencial**:
   - Repository Pattern: UI NUNCA acessa localStorage/Supabase direto — só via `useRepo()` / interface `Repository` (`src/lib/data/`).
   - Regras de negócio puras em `src/lib/domain/` — **TDD obrigatório** (teste antes da implementação).
   - Estrutura de pastas resumida (app/, components/, lib/data, lib/domain).
   - Datas com date-fns pt-BR; validação com Zod; cores de matéria via paleta de `constants.ts`; temas via tokens CSS do shadcn (nunca cor hardcoded).
4. **Git Flow**: branch `feature/fase-XX` a partir de `develop` → PR → merge; commits Conventional Commits; nunca push direto em develop/master; release via `release/vX.Y.Z` → master + tag.
5. **⚠️ SUPABASE — SEÇÃO CRÍTICA** (destacada):
   - Ref permitida: **`apceuvnqnrxfoongjvxq`** (projeto ConcursoFlow) — a ÚNICA.
   - PROIBIDO tocar: `bjglagkkodzlzlbnpwgp` (cds-criativos-stephannie), `pzxwxrxocksfknvqcmnu` (nuxo-bot), `yvjjatlindmruqmlmqpg` (omathcampos's Project).
   - Se qualquer comando/tool retornar outra ref: PARAR e avisar o usuário.
   - `supabase link` sempre com `--project-ref apceuvnqnrxfoongjvxq`.
6. **Migrations**: toda mudança de schema = migration versionada (`supabase migration new`) + linha no `MIGRATIONS.md` no mesmo commit; migrations aplicadas são imutáveis; nada de SQL avulso no dashboard.
7. **Segredos**: keys só em `.env.local` (gitignored) ou `supabase secrets` — nunca em arquivo versionado.
8. **Fluxo de fases**: os prompts vivem em `prompts/fase-XX-*.md`; cada fase tem critérios de aceite que devem TODOS passar antes do PR; e2e das fases anteriores devem continuar verdes.
9. **Estado do projeto**: seção curta "Fase atual: X concluída" — atualizar a cada fase concluída (colocar isso como instrução no próprio CLAUDE.md).

## Memória
Além do arquivo, salvar na memória do Claude Code (comando `#` ou editando a memória do projeto) os 2 fatos mais críticos: a ref Supabase permitida/proibidas e a regra "lint+test+e2e antes de commit".

## Critérios de aceite
- [ ] `CLAUDE.md` na raiz, ~80–120 linhas, cobrindo os 9 itens.
- [ ] Informação consistente com docs/ e prompts/ (sem contradições).
- [ ] Regras do Supabase em destaque visual (seção própria com ⚠️).
- [ ] Instrução de manutenção embutida (atualizar "fase atual" ao fechar cada fase).
- [ ] Commitado seguindo o Git Flow.
