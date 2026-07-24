# CLAUDE.md

## Visão em 3 linhas
ConcursoFlow é um app de cronograma de estudos para concursos públicos (calendário, ciclo de estudos, sessões, revisões espaçadas, dashboard). Stack: Next.js 16 (App Router, Turbopack) + TypeScript strict + Tailwind v4 + shadcn/ui (Base UI) + Zustand (local-first e cache do Supabase) + Supabase (banco real desde a fase 7). Estado atual: **Fases 0–6 concluídas e mergeadas; Fase 7 (Supabase) em revisão.**

## Comandos
- `npm run dev` — dev server (Turbopack)
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type check
- `npm run test` / `npm run test:watch` — Vitest (unit, `lib/domain/*`)
- `npm run e2e` — Playwright (`e2e/fase-XX-*.spec.ts`)
- `npm run build` — build de produção

**Regra: `lint` + `tsc` + `test` + `e2e` limpos antes de qualquer commit/PR.** Rodar a suíte e2e completa (não só a spec da fase atual) — regressão nas fases anteriores bloqueia o merge.

## Arquitetura essencial
- **Repository Pattern**: a UI nunca acessa localStorage/Supabase diretamente — só via `useRepo()` (`src/lib/data/use-repo.ts`), que retorna a interface `Repository` (`src/lib/data/repository.ts`) e escolhe a implementação por `NEXT_PUBLIC_DATA_SOURCE` (`local` | `supabase`, default `supabase` com fallback para `local` sem credenciais).
- **Leitura síncrona, mutação assíncrona**: `list()`/`get()`/`entries()`/`getActive()` são **síncronos** em ambas as implementações — o `LocalRepository` lê direto do Zustand (`src/lib/data/local/`), o `SupabaseRepository` (`src/lib/data/supabase/repository.ts`) lê de um **cache reativo Zustand** (`src/lib/data/supabase/cache-store.ts`) hidratado do banco no boot (`src/components/providers/data-provider.tsx`) e realimentado a cada mutação bem-sucedida (nunca fica stale) e no `focus` da janela. `create`/`update`/`remove`/etc. são **assíncronos de verdade** (I/O real) e só então atualizam o cache. **Fases futuras não devem converter `list()`/`get()` para `Promise`** — isso obrigaria reescrever a leitura de dados em toda página já pronta; a troca de backend sem tocar a UI é o objetivo do Repository Pattern.
- **Domínio puro** em `src/lib/domain/*.ts` (um arquivo por conceito: `cycle.ts`, `reviews.ts`, `stats.ts`, etc.), cada um com `*.test.ts` co-localizado. **TDD obrigatório**: teste antes da implementação.
- Estrutura: `src/app/` (rotas), `src/components/` (UI, por domínio: `calendar/`, `sessions/`, `reviews/`, `dashboard/`, `ui/` para primitives shadcn), `src/lib/data/` (repository + stores local/Supabase), `src/lib/domain/` (regras de negócio).
- Datas sempre via `date-fns` (locale pt-BR), usando `format()`/`isSameDay` local-safe — nunca `toISOString()` para comparar dias (desloca fuso). Validação de formulários com Zod. Cores de matéria: paleta fixa de 12 em `lib/calendar.ts`/seed. Tema: sempre tokens CSS do shadcn (`bg-card`, `text-muted-foreground`, etc.) — nunca cor hardcoded.
- shadcn/ui usa **Base UI**, não Radix: composição via prop `render`, não `asChild`. Links não devem passar por `Button render={<Link/>}` (Base UI exige semântica nativa de botão) — estilizar a `<a>` direto com `buttonVariants`.
- **React Compiler** (`reactCompiler: true`) pode parar de re-renderizar um componente após a primeira atualização de uma store externa (Zustand) se a subscrição não for uma dependência explícita — nunca `void store((s) => s)` e descartar; envolva a derivação em `useMemo(() => ..., [valorDaStore])`. Ver `useRepo()` para o padrão correto.

## Git Flow
Branch `feature/fase-XX-nome` a partir de `develop` → PR → CI verde → merge → apaga a branch. Commits em Conventional Commits. Nunca push direto em `develop`/`master`. Checkbox da fase no README marcado via PR próprio (`docs: check off Fase X`). Release final vira `master` com tag `vX.Y.Z`.

## ⚠️ Supabase — seção crítica
- Ref **permitida**: `apceuvnqnrxfoongjvxq` (projeto ConcursoFlow) — a **única**.
- **Proibido tocar**: `bjglagkkodzlzlbnpwgp` (cds-criativos-stephannie), `pzxwxrxocksfknvqcmnu` (nuxo-bot), `yvjjatlindmruqmlmqpg` (omathcampos's Project) — projetos de outros sistemas.
- Se qualquer comando/tool retornar uma ref diferente de `apceuvnqnrxfoongjvxq`: **parar imediatamente** e avisar o usuário.
- `supabase link` sempre com `--project-ref apceuvnqnrxfoongjvxq`.
- **Migrations**: toda mudança de schema é uma migration versionada (`supabase migration new nome`), nunca SQL avulso no dashboard. Registrar em `MIGRATIONS.md` (raiz) no mesmo commit: arquivo, descrição, data, ambiente, fase. Migrations aplicadas são imutáveis — correção é migration nova.
- Segredos (`SUPABASE_*`, `RESEND_API_KEY`, etc.) só em `.env.local` (gitignored) ou `supabase secrets` — nunca em arquivo versionado.

## Fluxo de fases
Prompts de cada fase em `prompts/fase-XX-*.md` (fonte de referência: pasta `cronograma/` fora do repo — resincronizar aqui quando houver novidades). Cada fase tem critérios de aceite que devem TODOS passar antes do PR, e a suíte e2e das fases anteriores precisa continuar verde (regressões intencionais são esperadas e documentadas no PR quando um comportamento muda de propósito).

## Estado do projeto
Fases 0–6 concluídas e mergeadas em `develop`. Fase 7 (Supabase — `SupabaseRepository`, cache reativo, importação de dados locais) implementada, aguardando CI/merge. Fases 8+ (Auth, Polimento, Notificações, Melhorias) ainda não iniciadas.

*(Atualizar esta seção ao final de cada fase — é a primeira coisa que uma nova sessão do Claude Code deve conferir.)*
