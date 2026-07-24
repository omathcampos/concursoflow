# FASE 1 — Setup do projeto + Design System

## Contexto
Você está na pasta do projeto **ConcursoFlow**, um app de cronograma de estudos para concursos. Leia antes: `docs/01-requisitos.md` e `docs/02-arquitetura.md`. Esta é a primeira fase — o repositório ainda não tem código.

## Objetivo
Criar o projeto Next.js com Tailwind, shadcn/ui, tema escuro, shell de navegação e todas as páginas como placeholders — app rodando e bonito, ainda sem funcionalidade.

## Tarefas
1. Criar app: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (na raiz desta pasta). Se o create-next-app sobrescrever o `.gitignore` da fase 0, mesclar os dois garantindo que `.env` e `.env*.local` continuem ignorados. Verificar com `git status` que nenhum arquivo sensível ou `node_modules` aparece antes de commitar.
2. Instalar deps: `npx shadcn@latest init` (tema zinc) e adicionar componentes: button, card, dialog, input, label, select, badge, tabs, dropdown-menu, popover, calendar, sonner (toasts), tooltip, progress. Instalar também: `zustand date-fns lucide-react next-themes zod`.
3. Configurar temas com `next-themes` (attribute="class", defaultTheme="system", enableSystem): seletor no header com 3 opções — Claro ☀️ / Escuro 🌙 / Sistema 🖥️ (dropdown ou toggle triplo). Escolha persiste; "Sistema" acompanha o SO em tempo real. Cuidar do flash de tema errado no primeiro paint (suppressHydrationWarning no html).
4. Design tokens em `globals.css`: fundo zinc-950, primária violet-500, fonte Inter via `next/font`.
5. Criar `src/lib/data/types.ts` com TODOS os modelos do domínio (copiar dos modelos em `docs/02-arquitetura.md` / `docs/03-schema.sql`, versão TypeScript com ids string).
6. Shell de layout: sidebar fixa (desktop) / drawer (mobile) com links: Dashboard (/), Calendário, Ciclo, Matérias, Sessões, Revisões — cada um com ícone lucide. Header com nome do app, toggle de tema e espaço reservado para countdown da prova.
7. Criar as 6 páginas como placeholders estilizados (título + card "em construção" com descrição do que virá).
8. Paleta de 12 cores para matérias em `src/lib/constants.ts` (hex + nome), ex.: violet, blue, cyan, emerald, lime, amber, orange, red, pink, fuchsia, indigo, teal.
9. **Infra de testes** (ver "Estratégia de testes" em `docs/02-arquitetura.md`): instalar e configurar Vitest (+ @testing-library/react) e Playwright. Scripts: `test`, `test:watch`, `e2e`. Criar um teste unit trivial (smoke) e um e2e `e2e/fase-01-setup.spec.ts` que verifica: app carrega, navegação pelas 6 páginas, troca de tema funciona. Confirmar que o CI da fase 0 executa tudo.

## Critérios de aceite
- [ ] `npm run dev` roda sem erros nem warnings de TypeScript.
- [ ] Seletor de tema com Claro/Escuro/Sistema; persiste após refresh e "Sistema" segue o SO.
- [ ] Ambos os temas ficam bonitos (testar todas as páginas nos dois).
- [ ] Navegação entre as 6 páginas funciona, link ativo destacado na sidebar.
- [ ] Sidebar colapsa em drawer no mobile (< 768px).
- [ ] `types.ts` compila com todos os modelos (Subject, Topic, Cycle, CycleEntry, Block, Session, Review) e enums.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` passam local e no CI.

## Não fazer
- Nenhuma funcionalidade real ainda. Nada de Supabase. Não criar páginas de login.
