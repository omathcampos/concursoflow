# FASE 9 — Polimento e Deploy

## Contexto
Fases 1–8 concluídas: app completo e multi-usuário. Fase final de qualidade.

## Objetivo
Deixar o app com acabamento profissional e publicado na Vercel.

## Tarefas
1. **Revisão visual geral**: consistência de espaçamentos, tamanhos de fonte e cores em todas as páginas; transições/hover em cards e botões; focus-visible em tudo (navegação por teclado); testar os 3 modos de tema (claro, escuro e sistema — o claro costuma ficar esquecido).
2. **Estados vazios e de erro**: toda lista/página tem empty state com CTA; error boundaries com mensagem amigável; página 404 estilizada.
3. **Responsividade final**: passar por todas as páginas em 375px, 768px e 1440px. Calendário mobile (agenda de dia) redondo.
4. **Performance**: `next build` sem warnings; verificar bundle (recharts e dnd-kit só nas páginas que usam — dynamic import se necessário); imagens/ícones otimizados.
5. **PWA leve** (opcional, mas recomendado): manifest + ícone para "instalar" no celular.
6. **Qualidade**: rodar ESLint/tsc zerados; revisar TODOs; remover código morto e o repositório local se não for mais útil (ou manter atrás de flag). Suíte completa (Vitest + todas as specs e2e das fases 1–8) verde local e no CI; revisar cobertura das funções de domínio (alvo: 100% em `lib/domain/`).
7. **Release v1.0.0**: branch `release/v1.0.0` a partir de `develop` → PR para `master` → merge → tag `v1.0.0` → back-merge em `develop` (fluxo do CONTRIBUTING.md).
8. **Deploy**: conectar o repo GitHub à Vercel (produção = `master`, previews = PRs) com as envs do Supabase; configurar URL de produção nos redirects de auth do Supabase (Site URL + redirect URLs); testar cadastro/login em produção.
9. **README do projeto**: atualizar o `README.md` existente — adicionar screenshots, revisar instruções/envs e marcar todas as fases do roadmap como concluídas.

## Critérios de aceite
- [ ] `next build` limpo; tsc e ESLint zerados.
- [ ] App publicado na Vercel; cadastro, login e todas as features funcionam em produção.
- [ ] Auth redirects de produção configurados no Supabase.
- [ ] Navegável 100% por teclado nas telas principais.
- [ ] Mobile confortável nas 7 páginas.
