-- pg_cron + pg_net: agenda os 3 tipos de notificação. O secret usado no
-- header x-cron-secret NÃO fica embutido aqui — vem do Supabase Vault
-- (vault.decrypted_secrets, nome 'cron_secret'), inserido separadamente via
-- execute_sql (nunca em migration versionada). Ver MIGRATIONS.md.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- daily: de hora em hora (a function filtra pela hora local de cada usuário).
select cron.schedule(
  'notif-daily-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://apceuvnqnrxfoongjvxq.supabase.co/functions/v1/daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- weekly: diário 23h UTC (a function confere se é domingo no fuso do usuário).
select cron.schedule(
  'notif-weekly-daily-check',
  '0 23 * * *',
  $$
  select net.http_post(
    url := 'https://apceuvnqnrxfoongjvxq.supabase.co/functions/v1/weekly',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- overdue: diário 15h UTC (~meio-dia no Brasil).
select cron.schedule(
  'notif-overdue-daily',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://apceuvnqnrxfoongjvxq.supabase.co/functions/v1/overdue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
