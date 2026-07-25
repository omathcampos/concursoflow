-- ============================================================
-- ConcursoFlow — Fase 10: notificações (email + Telegram)
-- ============================================================

-- ---------- notification_prefs ----------
create table public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_enabled boolean not null default true,
  daily_hour int not null default 7 check (daily_hour between 0 and 23),
  weekly_enabled boolean not null default true,
  overdue_enabled boolean not null default true,
  channel_email boolean not null default true,
  channel_telegram boolean not null default false,
  telegram_chat_id text,
  timezone text not null default 'America/Sao_Paulo',
  unsubscribe_token uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;
create policy "own row select" on public.notification_prefs for select using (user_id = auth.uid());
create policy "own row update" on public.notification_prefs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Sem policy de insert pro usuário: a linha é criada pelo trigger handle_new_user (security definer).
-- Update de telegram_chat_id pelo webhook e leitura/escrita da edge function usam service_role, que ignora RLS.

create unique index notification_prefs_unsubscribe_token_idx on public.notification_prefs (unsubscribe_token);

-- ---------- notification_log ----------
create table public.notification_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('daily', 'weekly', 'overdue')),
  channel text not null check (channel in ('email', 'telegram')),
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed'))
);

alter table public.notification_log enable row level security;
create policy "own row select" on public.notification_log for select using (user_id = auth.uid());
-- Inserts feitos pela edge function via service_role — sem policy de insert pro usuário.

create index notification_log_idempotency_idx on public.notification_log (user_id, type, channel, sent_at desc);

-- ---------- telegram_link_codes ----------
create table public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table public.telegram_link_codes enable row level security;
create policy "own row select" on public.telegram_link_codes for select using (user_id = auth.uid());
create policy "own row insert" on public.telegram_link_codes for insert with check (user_id = auth.uid());
-- Marcar como usado (used_at) é feito pela edge function do webhook via service_role.

-- ---------- handle_new_user: também cria a preferência default ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.notification_prefs (user_id) values (new.id);
  return new;
end $$;

-- Backfill para usuários já existentes (criados antes desta migration).
insert into public.notification_prefs (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
