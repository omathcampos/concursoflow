-- O campo `scheduleReview` existe no tipo Session (TS) desde a fase 4/5
-- (intenção de agendar revisão espaçada ao criar a sessão), mas nunca foi
-- adicionado a docs/03-schema.sql. Sem esta coluna o SupabaseRepository
-- perderia esse campo em cada ida-e-volta.
alter table public.sessions add column schedule_review boolean not null default false;
