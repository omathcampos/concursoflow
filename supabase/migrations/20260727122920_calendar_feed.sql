-- Fase 12: feed iCal (.ics) por assinatura. Cada usuário ganha um token
-- opaco (independente do id, para poder ser regenerado sem afetar nada
-- mais) que identifica o feed publicamente — o endpoint que o serve usa
-- service role e faz o lookup EXCLUSIVAMENTE por esse token, nunca por
-- auth.uid(), então a política de RLS de "own profile" já basta (o token
-- em si não passa pelo caminho de RLS).
alter table public.profiles
  add column calendar_feed_token uuid not null unique default uuid_generate_v4(),
  add column calendar_feed_include_reviews boolean not null default false;

comment on column public.profiles.calendar_feed_token is 'Token opaco do feed iCal público (.ics) — regenerável a qualquer momento pelo usuário.';
comment on column public.profiles.calendar_feed_include_reviews is 'Preferência: incluir revisões pendentes como eventos de dia inteiro no feed iCal.';
