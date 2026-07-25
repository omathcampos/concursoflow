-- Corrige alerta do advisor de segurança (function_search_path_mutable):
-- notif_local_bounds só usa funções built-in (date_trunc/extract, sempre em
-- pg_catalog), então search_path vazio é seguro e fecha o vetor de
-- sequestro via search_path malicioso.
alter function public.notif_local_bounds(text, timestamptz) set search_path = '';
