# 02 — Arquitetura

## Decisões técnicas

| Decisão | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 15, App Router | Integração nativa com Supabase (SSR helpers), deploy grátis na Vercel |
| Linguagem | TypeScript estrito | Segurança nos modelos de dados |
| Estilo | Tailwind v4 + shadcn/ui | Design bonito rápido, componentes acessíveis |
| Ícones | lucide-react | Padrão do shadcn |
| Gráficos | Recharts | Simples e bonito para dashboard |
| Drag & drop | @dnd-kit/core | Leve, acessível, ideal para calendário |
| Datas | date-fns (locale pt-BR) | Leve, tree-shakeable |
| Estado | Zustand + persist (localStorage) | Simples; o middleware `persist` sai de graça |
| Backend | Supabase (fase 7+) | Postgres + Auth + RLS prontos |
| Validação | Zod | Schemas compartilhados entre forms e camada de dados |

## Estratégia de dados: Repository Pattern

**Ponto mais importante da arquitetura.** Toda a UI fala com uma interface `Repository`, nunca com localStorage ou Supabase diretamente:

```ts
// src/lib/data/repository.ts
export interface Repository {
  subjects: CrudRepo<Subject>;
  topics: CrudRepo<Topic>;
  cycle: CycleRepo;
  blocks: BlockRepo;      // calendário
  sessions: SessionRepo;
  reviews: ReviewRepo;
}
```

- Fases 1–6: `LocalRepository` (Zustand + persist).
- Fase 7: `SupabaseRepository` implementa a MESMA interface. Troca via provider, UI intocada.
- Fase 8: auth só adiciona `user_id` no SupabaseRepository + RLS.

## Estrutura de pastas

```
src/
├── app/
│   ├── layout.tsx              # shell: sidebar + header
│   ├── page.tsx                # dashboard (home)
│   ├── calendario/page.tsx
│   ├── ciclo/page.tsx
│   ├── materias/page.tsx
│   ├── sessoes/page.tsx
│   ├── revisoes/page.tsx
│   ├── anotacoes/page.tsx
│   └── (auth)/                 # fase 8: login, cadastro
├── components/
│   ├── ui/                     # shadcn
│   ├── calendar/               # WeekGrid, EventBlock, MonthView, DragLayer
│   ├── cycle/                  # CycleBoard, SubjectProgress
│   ├── sessions/               # SessionForm, Timer, SessionList
│   ├── reviews/                # ReviewQueue, ReviewCard
│   └── dashboard/              # StatCard, HoursChart, AccuracyChart, Streak
├── lib/
│   ├── data/
│   │   ├── types.ts            # modelos (Subject, Block, Session...)
│   │   ├── repository.ts       # interface
│   │   ├── local/              # implementação Zustand/localStorage
│   │   └── supabase/           # implementação fase 7
│   ├── domain/                 # regras puras: nextSubject(), scheduleReviews(), streak()
│   └── utils.ts
└── styles/globals.css
```

## Modelos de dados (resumo — schema completo em 03-schema.sql)

- **subjects**: id, name, color, weight(1–5), notes
- **topics**: id, subject_id, name, status, notes
- **annotations**: id, subject_id?, topic_id?, title, content(markdown), updated_at
- **cycles**: id, name, is_active / **cycle_entries**: cycle_id, subject_id, target_minutes, done_minutes(derivado)
- **blocks** (calendário): id, subject_id, topic_id?, start_at, end_at, type, status, recurrence?
- **sessions**: id, subject_id, topic_id?, block_id?, type, started_at, duration_min, questions_total?, questions_correct?, pages_read?, notes
- **reviews**: id, session_id, subject_id, due_date, step(1|2|3), status

## Regras de domínio (funções puras em lib/domain, testáveis)

- `suggestNextSubject(cycle)`: menor progresso ponderado por peso.
- `scheduleReviews(session)`: cria review step 1 (D+1); concluir step N cria step N+1 (D+7, D+30).
- `computeStreak(sessions)`: dias consecutivos com ≥1 sessão.
- `detectOverlap(blocks, candidate)`: impede blocos sobrepostos no mesmo horário.

## Migrations — versionamento e histórico (fase 7+)

- **Nunca** alterar o banco por SQL avulso no dashboard: toda mudança de schema é uma migration versionada no repo.
- Arquivos em `supabase/migrations/YYYYMMDDHHMMSS_nome_descritivo.sql` (gerados com `supabase migration new nome` — o timestamp no nome dá a ordem cronológica). Commitados no git como qualquer código.
- O Supabase registra o que já foi aplicado em `supabase_migrations.schema_migrations` (fonte da verdade no banco; conferir com `supabase migration list`).
- **`MIGRATIONS.md`** na raiz: changelog humano, atualizado no MESMO commit de cada migration. Tabela com: arquivo, descrição, data em que foi aplicada, ambiente (dev/prod), fase do projeto e observações (ex.: "requer backfill"). Exemplo:

| Arquivo | Descrição | Aplicada em | Ambiente | Fase |
|---|---|---|---|---|
| `20260801120000_initial_schema.sql` | Schema inicial (docs/03-schema.sql) | 2026-08-01 | dev | 7 |

- Migrations são **imutáveis** depois de aplicadas: correção = nova migration, nunca editar arquivo antigo.
- O CI/PR checklist inclui: migration nova → linha correspondente no MIGRATIONS.md.

## Supabase (fase 7–8)

- Cliente: `@supabase/ssr` (server components + client).
- Fase 7: projeto criado, schema aplicado via migration (03-schema.sql), app usa um usuário anônimo/fixo OU mantém local + botão "sincronizar" — decisão na fase.
- Fase 8: Auth email/senha; todas as tabelas ganham `user_id uuid references auth.users` com RLS `user_id = auth.uid()`; middleware protege rotas.

## Estratégia de testes (obrigatória)

| Camada | Ferramenta | Quando |
|---|---|---|
| Unit (domínio) | Vitest | **TDD**: escrever os testes ANTES da implementação |
| Componentes críticos | Vitest + Testing Library | Junto com a implementação |
| E2E | Playwright | **Ao final de cada feature/fase**, antes do PR |

**TDD — fluxo por feature:**
1. Red: escrever os testes das funções de domínio (`lib/domain/*`) a partir dos critérios de aceite — devem falhar.
2. Green: implementar o mínimo para passar.
3. Refactor: limpar mantendo verde.

Aplica-se rigorosamente a `lib/domain/` (funções puras: `suggestNextSubject`, `scheduleReviews`, `computeStreak`, `detectOverlap`, agregadores de stats) e à camada Repository (testar `LocalRepository` com storage mockado; fase 7 testa os mappers do Supabase).

**E2E — regras:**
- Cada fase termina com specs Playwright cobrindo o fluxo principal da feature (ex.: fase 2 → criar matéria, montar ciclo, ver sugestão; fase 3 → criar bloco, arrastar, impedir sobreposição).
- Specs em `e2e/fase-XX-nome.spec.ts`; as das fases anteriores DEVEM continuar passando (regressão).
- Rodar com `DATA_SOURCE=local` até a fase 6; fase 7+ contra um banco de teste/branch do Supabase, nunca contra dados reais.
- PR só abre com `npm run test` e `npm run e2e` verdes; CI executa ambos.

## Design system

- Temas Claro/Escuro/Sistema via next-themes (`class` strategy, defaultTheme="system", enableSystem); seletor triplo no header.
- Paleta escuro: fundo zinc-950/900, superfícies zinc-900/800. Paleta claro: fundo zinc-50/branco, superfícies white/zinc-100. Comuns: primária violet-500 (violet-600 no claro para contraste), sucesso emerald-500, atenção amber-500 — sempre via tokens CSS do shadcn (`--background`, `--card`, `--primary`...), nunca cor hardcoded em componente.
- Cores de matéria: paleta fixa de 12 cores (usadas em blocos, gráficos, badges).
- Fonte: Inter (next/font). Cantos `rounded-xl`, sombras suaves, transições 150ms.
