# 📚 ConcursoFlow — Cronograma de Estudos para Concursos

Plataforma web de planejamento e acompanhamento de estudos para concurseiros, integrando o fluxo de quem usa **Tec Concursos** (questões) e **Estratégia Concursos** (aulas/PDFs).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) + React + TypeScript |
| Estilo | Tailwind CSS v4 + shadcn/ui + lucide-react |
| Gráficos | Recharts |
| Drag & Drop | @dnd-kit |
| Backend/DB | Supabase (Postgres + Auth + RLS) |
| Deploy | Vercel |

## Estrutura do planejamento

```
cronograma/
├── README.md                → README do app (vai para o GitHub)
├── PLANO.md                 → você está aqui
├── docs/
│   ├── 01-requisitos.md     → requisitos funcionais e não-funcionais
│   ├── 02-arquitetura.md    → arquitetura, pastas, decisões técnicas
│   └── 03-schema.sql        → schema completo do Supabase (com RLS)
└── prompts/
    ├── fase-00-github.md        → repo GitHub + Git Flow + proteção de branches
    ├── fase-01-setup.md         → projeto Next.js + Tailwind + design system
    ├── fase-02-materias-ciclo.md→ matérias + ciclo de estudos
    ├── fase-03-calendario.md    → calendário com drag & drop
    ├── fase-04-sessoes-timer.md → registro de sessões + cronômetro
    ├── fase-05-revisoes.md      → revisões espaçadas
    ├── fase-06-dashboard.md     → dashboard com estatísticas
    ├── fase-07-supabase.md      → migração localStorage → Supabase
    ├── fase-08-auth.md          → cadastro/login de usuários (por último!)
    ├── fase-09-polimento.md     → polimento, responsividade e deploy
    ├── fase-10-notificacoes.md  → email + Telegram: lembrete diário, relatório semanal, alertas
    ├── fase-11-melhorias.md     → anotações markdown, observações, modo foco do cronômetro
    └── extra-claude-md.md       → gerar CLAUDE.md (executar antes da fase 7)
```

## Como usar

1. Abra uma sessão do Claude (Cowork ou Claude Code) nesta pasta.
2. Execute **um prompt por vez**, em ordem: cole o conteúdo de `prompts/fase-XX-*.md`.
3. Cada fase tem **critérios de aceite** — só avance quando todos passarem.
4. As fases 1–6 rodam 100% com `localStorage` (sem backend). Supabase entra na fase 7 e autenticação só na fase 8.
5. A partir da fase 0, cada fase segue o Git Flow: branch `feature/fase-XX` a partir de `develop` → PR → merge. Release para `master` só no final (fase 9).

## Regra de ouro

Cada fase termina com o app **funcionando de ponta a ponta**. Nunca deixe a aplicação quebrada entre fases.

## Testes

**TDD sempre**: nas regras de domínio, testes Vitest são escritos ANTES da implementação (red → green → refactor). **E2E ao final de cada feature**: cada fase entrega sua spec Playwright em `e2e/`, e as specs das fases anteriores devem continuar verdes (regressão). PR só abre com `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` passando — **rodar lint sempre, ao final de cada fase, antes de commitar**. Detalhes em `docs/02-arquitetura.md` → "Estratégia de testes".
