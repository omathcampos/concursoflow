-- ============================================================
-- ConcursoFlow — Schema Supabase (Postgres)
-- Aplicar na fase 7 (sem RLS de usuário) e fase 8 (user_id + RLS)
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ---------- ENUMS ----------
create type topic_status as enum ('not_started', 'studying', 'done');
create type block_type as enum ('teoria', 'questoes', 'revisao', 'lei_seca', 'aula');
create type block_status as enum ('planned', 'done', 'skipped');
create type review_status as enum ('pending', 'done', 'skipped');

-- ---------- TABELAS ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  target_exam text,            -- concurso-alvo
  exam_date date,              -- para countdown
  created_at timestamptz default now()
);

create table public.subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#8b5cf6',
  weight int not null default 3 check (weight between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

create table public.topics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  status topic_status not null default 'not_started',
  position int not null default 0,
  notes text,
  created_at timestamptz default now()
);

create table public.cycles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Meu ciclo',
  is_active boolean not null default true,
  round int not null default 1,          -- rodada atual
  created_at timestamptz default now()
);

create table public.cycle_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  target_minutes int not null check (target_minutes > 0),
  unique (cycle_id, subject_id)
);

create table public.blocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  type block_type not null default 'teoria',
  status block_status not null default 'planned',
  start_at timestamptz not null,
  end_at timestamptz not null,
  recurrence_rule text,                  -- ex.: 'WEEKLY:MO' (simplificado)
  notes text,
  created_at timestamptz default now(),
  check (end_at > start_at)
);

create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  block_id uuid references public.blocks(id) on delete set null,
  cycle_id uuid references public.cycles(id) on delete set null,
  cycle_round int,                       -- em qual rodada do ciclo contou
  type block_type not null default 'teoria',
  started_at timestamptz not null,
  duration_min int not null check (duration_min > 0),
  questions_total int check (questions_total >= 0),
  questions_correct int check (questions_correct >= 0),
  pages_read int check (pages_read >= 0),
  notes text,
  created_at timestamptz default now(),
  check (questions_correct is null or questions_total is null or questions_correct <= questions_total)
);

create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  step int not null check (step in (1, 2, 3)),   -- 1=24h, 2=7d, 3=30d
  due_date date not null,
  status review_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table public.annotations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  content text not null default '',        -- markdown
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- ÍNDICES ----------
create index idx_blocks_user_start on public.blocks (user_id, start_at);
create index idx_sessions_user_started on public.sessions (user_id, started_at);
create index idx_reviews_user_due on public.reviews (user_id, due_date) where status = 'pending';
create index idx_topics_subject on public.topics (subject_id);
create index idx_annotations_user on public.annotations (user_id, updated_at desc);

-- ---------- RLS (fase 8) ----------
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.cycles enable row level security;
alter table public.cycle_entries enable row level security;
alter table public.blocks enable row level security;
alter table public.sessions enable row level security;
alter table public.reviews enable row level security;
alter table public.annotations enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Padrão para todas as tabelas com user_id:
do $$
declare t text;
begin
  foreach t in array array['subjects','topics','cycles','cycle_entries','blocks','sessions','reviews','annotations'] loop
    execute format('create policy "own rows select" on public.%I for select using (user_id = auth.uid())', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "own rows update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "own rows delete" on public.%I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------- TRIGGER: perfil automático no signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
