# Contribuindo

## Fluxo de branches (Git Flow simplificado)

```
feature/fase-XX-nome ──PR──▶ develop ──release/vX.Y.Z──PR──▶ master (+ tag vX.Y.Z)
```

- `master`: código em produção (deploy Vercel). Só recebe merges de branches `release/*` via PR.
- `develop`: branch de integração. Branch padrão do repositório. Só recebe merges de `feature/*` via PR.
- `feature/fase-XX-nome`: uma branch por fase do projeto (ver `PLANO.md` e `prompts/`), criada a partir de `develop` atualizada.
- **Nunca** commit direto em `develop` ou `master` — ambas são protegidas e exigem PR.

## Passo a passo por fase

1. Atualizar `develop` local: `git checkout develop && git pull`.
2. Criar a branch: `git checkout -b feature/fase-XX-nome`.
3. Implementar seguindo `prompts/fase-XX-*.md`, com TDD (Vitest) nas regras de domínio e specs Playwright ao final (ver `docs/02-arquitetura.md` → "Estratégia de testes").
4. Abrir PR para `develop`: `gh pr create --base develop`.
5. Aguardar CI verde (`.github/workflows/ci.yml`: lint, type-check, testes unitários, build, e2e).
6. Marcar os critérios de aceite da fase no checklist do PR e no `README.md`.
7. Merge do PR (squash ou merge commit) e apagar a branch.

## Commits

Conventional Commits:

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `chore:` manutenção, config, dependências
- `docs:` documentação
- `test:` testes
- `refactor:` refatoração sem mudança de comportamento

## Release (fim da fase 9)

1. Criar `release/vX.Y.Z` a partir de `develop` atualizada.
2. Ajustes finais (versão, changelog) se necessário.
3. Abrir PR de `release/vX.Y.Z` para `master`.
4. Após merge, criar tag `vX.Y.Z` em `master` e publicar release no GitHub.
5. Back-merge de `master` em `develop` para manter as branches sincronizadas.

## Proteção de branches

`master` e `develop` bloqueiam: push direto, force-push e deleção. Exigem PR, status checks do CI verdes e branch atualizada antes do merge.

> Branch protection clássica (`branches/{branch}/protection`) exige GitHub Pro ou repositório público em repositório privado no plano Free. Por isso o repositório é **público** e a proteção foi aplicada via **rulesets** (`gh api repos/{owner}/{repo}/rulesets`).

### Estado aplicado (Fase 0)

- Repositório público (necessário para rulesets no plano Free).
- Rulesets `protect-master` e `protect-develop`: bloqueiam push direto (non-fast-forward) e deleção, exigem PR e o status check `ci` verde e atualizado (`strict_required_status_checks_policy: true`).
- Aprovação de review não é exigida (projeto solo) — a obrigatoriedade é do PR + CI, não de um segundo revisor.
