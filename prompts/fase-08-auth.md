# FASE 8 — Cadastro e Autenticação de Usuários

## Contexto
Fases 1–7 concluídas: app rodando sobre Supabase com usuário técnico fixo. Leia `docs/01-requisitos.md` (RF07). O schema e as policies RLS já existem (`docs/03-schema.sql`) — esta fase troca o usuário fixo por usuários reais.

## Objetivo
Cadastro, login e isolamento de dados por usuário via Supabase Auth.

> ⚠️ Todas as operações Supabase desta fase usam **exclusivamente a ref do projeto criado na fase 7** (ver anotação em `fase-07-supabase.md`). Os projetos `bjglagkkodzlzlbnpwgp`, `pzxwxrxocksfknvqcmnu` e `yvjjatlindmruqmlmqpg` são de outros sistemas — não tocar. Confirmar a ref com o usuário antes da primeira operação.

## Tarefas
1. **Páginas** no route group `(auth)` com layout próprio (centrado, card, logo):
   - `/login`: email + senha, link "esqueci a senha", link para cadastro. Opcional: botão Google OAuth.
   - `/cadastro`: nome, email, senha (mínimo 8 chars, indicador de força simples), confirmação por email conforme config do projeto.
   - `/recuperar-senha` + rota de callback para redefinição.
2. **Middleware** (`middleware.ts` com `@supabase/ssr`): rotas do app exigem sessão → redirect `/login`; `/login` e `/cadastro` com sessão ativa → redirect `/`.
3. **Repository**: remover `DEV_USER_ID` e o login programático da fase 7; `user_id` vem de `auth.getUser()`. O trigger `handle_new_user` do schema já cria o profile no signup.
4. **Header**: menu do usuário (avatar com iniciais) → Perfil, Sair. Página/dialog de perfil: nome de exibição, concurso-alvo, data da prova (o countdown da fase 6 passa a ler do profile no Supabase).
5. **Onboarding**: usuário novo sem dados → tela de boas-vindas com CTA "criar minha primeira matéria" (e opção de carregar dados de exemplo).
6. **Verificações de segurança**: confirmar RLS ativo em todas as tabelas testando com dois usuários (dados de A invisíveis para B). Rodar advisors do Supabase e corrigir alertas.

## Testes (TDD)
- **Antes de implementar**: testes Vitest dos guards/redirects do middleware (mock de sessão) e validação Zod do cadastro (senha fraca, emails inválidos).
- **Ao final**: `e2e/fase-08-auth.spec.ts` — cadastro, login, logout, rota protegida redireciona, e **isolamento**: usuário B não vê dados do usuário A (criar 2 contas de teste no banco de teste). Regressão: suíte completa verde logado.

## Critérios de aceite
- [ ] Cadastro cria usuário + profile automaticamente; login e logout funcionam.
- [ ] Usuário deslogado não acessa nenhuma página do app (redirect).
- [ ] Dois usuários têm dados completamente isolados (testar de verdade com 2 contas).
- [ ] Recuperação de senha por email funciona.
- [ ] Countdown da prova lê do profile.
- [ ] Advisors do Supabase sem alertas críticos.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos antes do PR.

## Não fazer
- Planos pagos, roles/admin, exclusão de conta (pode ficar para depois).
