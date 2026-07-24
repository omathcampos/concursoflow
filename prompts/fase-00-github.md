# FASE 0 — Repositório GitHub + Git Flow + Proteção de Branches

## Contexto
Projeto **ConcursoFlow** (leia `docs/02-arquitetura.md`). Antes de qualquer código, configurar o repositório com fluxo profissional: `master` (produção) ← releases ← `develop` ← feature branches, com PRs obrigatórios. Requer `gh` CLI autenticado (`gh auth status`; se não, `gh auth login`).

## Objetivo
Repositório criado, branches e proteções configuradas, templates de PR e CI básico prontos.

## Fluxo de trabalho (documentar em CONTRIBUTING.md)
```
feature/fase-XX-nome ──PR──▶ develop ──release/vX.Y.Z──PR──▶ master (+ tag vX.Y.Z)
```
- Cada fase do projeto = uma branch `feature/fase-XX-nome` a partir de `develop`.
- Nada de commit direto em `develop` ou `master` — sempre PR.
- Release: branch `release/vX.Y.Z` a partir de `develop` → PR para `master` → merge → tag `vX.Y.Z` → back-merge em `develop`.
- Commits em Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`...).

## Tarefas
1. **Git local**: `git init` na raiz (se ainda não houver) e criar `.gitignore` completo de Node/Next **antes do primeiro commit**: `node_modules/`, `.next/`, `out/`, `build/`, `.env`, `.env*.local`, `.vercel`, `*.tsbuildinfo`, `.DS_Store`, logs. Commit inicial com `README.md` (o README do app, já pronto), `PLANO.md` e os arquivos de planejamento (`docs/`, `prompts/`).
2. **Repo remoto**: `gh repo create concursoflow --private --source=. --push`. Descrição: "Cronograma de estudos para concursos — Next.js + Supabase".
3. **Branches**: criar `develop` a partir de `master` e enviar (`git push -u origin develop`). Definir `develop` como branch padrão do repo (`gh repo edit --default-branch develop`) — PRs novos apontam para ela por padrão.
4. **Proteção de branches** (via `gh api repos/{owner}/{repo}/branches/{branch}/protection` ou ruleset):
   - `master`: exigir PR com ≥0 aprovações (projeto solo — a obrigatoriedade é do PR, não do reviewer), bloquear push direto e force-push, bloquear deleção, exigir status checks (CI) verdes, exigir branch atualizada antes do merge.
   - `develop`: mesmas regras.
   - Obs.: em repo privado no plano free, branch protection via API pode ser limitada — se a API recusar, usar **rulesets** (`gh api repos/{owner}/{repo}/rulesets` ou dashboard) e registrar no CONTRIBUTING.md o que foi aplicado.
5. **CI mínimo** (`.github/workflows/ci.yml`): em PRs para `develop` e `master` → checkout, setup Node 20 com cache, `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run test` (Vitest), `npm run build` e `npm run e2e` (Playwright, com `npx playwright install --with-deps chromium`). Steps de teste devem ser tolerantes à ausência dos scripts até a fase 1 configurá-los. Enquanto o projeto Next não existe (fase 1), o workflow deve detectar ausência de `package.json` e passar com aviso (para não travar este PR inicial).
6. **Templates**: `.github/pull_request_template.md` (O que foi feito / Fase relacionada / Checklist: critérios de aceite da fase, sem erros de tsc, testado localmente) e `CONTRIBUTING.md` com o fluxo acima.
7. **Labels**: criar labels `fase-1`...`fase-9`, `bug`, `melhoria` (`gh label create`).
8. **Teste do fluxo**: criar branch `feature/fase-00-github` com estes arquivos de config, abrir PR para `develop` (`gh pr create`), verificar que o CI roda e que push direto em `develop` é rejeitado, e fazer merge pelo PR.

## Critérios de aceite
- [ ] Repo privado `concursoflow` no GitHub com `master` e `develop`; `develop` é a padrão.
- [ ] Push direto em `master` e `develop` rejeitado (testar de verdade: `git push origin develop` com commit direto deve falhar).
- [ ] PR de teste passou pelo CI e foi mergeado em `develop` via interface/`gh pr merge`.
- [ ] CONTRIBUTING.md documenta o fluxo completo, incluindo o processo de release com tag.
- [ ] Template de PR aparece automaticamente ao abrir PRs.

## Como as demais fases usam isso
Ao executar cada `fase-XX`: criar `feature/fase-XX-nome` a partir de `develop` atualizada → implementar → PR para `develop` → CI verde → merge. Ao final da fase 9: release `v1.0.0` para `master`.
