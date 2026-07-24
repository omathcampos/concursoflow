# Migrations

Changelog humano das migrations aplicadas ao banco Supabase do ConcursoFlow (ref `apceuvnqnrxfoongjvxq`, projeto **ConcursoFlow**). Atualizado no mesmo commit de cada migration — ver `docs/02-arquitetura.md` para o fluxo completo.

| Arquivo | Descrição | Aplicada em | Ambiente | Fase |
|---|---|---|---|---|
| `20260724124054_initial_schema.sql` | Schema inicial (`docs/03-schema.sql`): enums, tabelas (profiles, subjects, topics, cycles, cycle_entries, blocks, sessions, reviews, annotations), índices, RLS por `user_id`/`auth.uid()` em todas as tabelas, trigger `handle_new_user` para criar profile automático no signup | 2026-07-24 | dev (produção do projeto ConcursoFlow) | 7 |
| `20260724124826_add_schedule_review_to_sessions.sql` | Adiciona `sessions.schedule_review boolean not null default false` — campo já existente no tipo TS `Session` (fase 4/5) que nunca tinha sido incluído em `docs/03-schema.sql`; sem ele o `SupabaseRepository` perderia o dado em cada ida-e-volta. `docs/03-schema.sql` atualizado para refletir a coluna | 2026-07-24 | dev (produção do projeto ConcursoFlow) | 7 |
