-- Fronteiras de dia/semana no fuso do usuário, convertidas para UTC — usado pelas
-- Edge Functions de notificação pra filtrar blocos/sessões/revisões corretamente
-- por fuso (evita reimplementar timezone math em TypeScript no Deno).
create or replace function public.notif_local_bounds(p_timezone text, p_now timestamptz default now())
returns table(
  day_start timestamptz,
  day_end timestamptz,
  week_start timestamptz,
  week_end timestamptz,
  prev_week_start timestamptz,
  is_sunday boolean,
  local_hour int,
  local_date date
)
language sql
stable
as $$
  select
    date_trunc('day', p_now at time zone p_timezone) at time zone p_timezone as day_start,
    (date_trunc('day', p_now at time zone p_timezone) + interval '1 day') at time zone p_timezone as day_end,
    date_trunc('week', p_now at time zone p_timezone) at time zone p_timezone as week_start,
    (date_trunc('week', p_now at time zone p_timezone) + interval '7 days') at time zone p_timezone as week_end,
    (date_trunc('week', p_now at time zone p_timezone) - interval '7 days') at time zone p_timezone as prev_week_start,
    extract(dow from p_now at time zone p_timezone) = 0 as is_sunday,
    extract(hour from p_now at time zone p_timezone)::int as local_hour,
    (p_now at time zone p_timezone)::date as local_date;
$$;

revoke execute on function public.notif_local_bounds(text, timestamptz) from public, anon, authenticated;
grant execute on function public.notif_local_bounds(text, timestamptz) to service_role;
