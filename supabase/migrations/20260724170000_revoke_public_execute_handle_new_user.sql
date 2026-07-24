-- ============================================================
-- Fase 8 — hardening: handle_new_user() é uma função de trigger
-- (executada apenas por `on_auth_user_created`), não deve ser
-- chamável diretamente via RPC (/rest/v1/rpc/handle_new_user).
-- ============================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;
