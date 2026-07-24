# FASE 7 — Supabase (banco de dados real)

## Contexto
Fases 1–6 concluídas: app 100% funcional com localStorage atrás da interface `Repository`. Leia `docs/02-arquitetura.md` (Repository Pattern) e `docs/03-schema.sql`. Auth ainda NÃO entra nesta fase (é a fase 8) — o objetivo aqui é a infraestrutura de dados.

## Objetivo
Criar o projeto Supabase, aplicar o schema e implementar `SupabaseRepository` com a mesma interface, mantendo o app funcionando.

## Tarefas
1. **Projeto Supabase**: criar um projeto **NOVO** (sugestão de nome: `concursoflow`), via dashboard ou MCP/CLI, região `sa-east-1` (São Paulo). Guardar URL e anon key em `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — confirmar que `.env*.local` já está no `.gitignore`.

   > ⚠️ **ATENÇÃO — a conta tem outros projetos Supabase que NÃO podem ser tocados**:
   > - `cds-criativos-stephannie` (ref: `bjglagkkodzlzlbnpwgp`)
   > - `nuxo-bot` (ref: `pzxwxrxocksfknvqcmnu`)
   > - `omathcampos's Project` (ref: `yvjjatlindmruqmlmqpg`)
   >
   > Regras obrigatórias:
   > 1. Antes de qualquer operação, listar os projetos e **mostrar ao usuário qual ref será usada, pedindo confirmação explícita**.
   > 2. Toda migration, `execute_sql`, `supabase link`, geração de types e deploy deve apontar **exclusivamente para a ref do projeto novo** criado nesta fase. Nunca usar `supabase link` sem `--project-ref`.
   > 3. Anotar a ref do projeto novo neste arquivo e no `.env.local` assim que criado.
   > 4. Se qualquer comando/tool retornar um ref diferente do projeto novo, **parar imediatamente** e avisar o usuário.
   >
   > Ref do projeto novo (preencher ao criar): `____________________`
2. **Schema**: aplicar `docs/03-schema.sql` como migration. Observação: o schema referencia `auth.users` e tem RLS — nesta fase, criar um usuário técnico via dashboard (email fictício confirmado) e usar seu UUID como `user_id` fixo no repositório (constante `DEV_USER_ID` em env). Fazer login programático desse usuário no boot do app (client) para as policies passarem — assim a fase 8 vira só "trocar o usuário fixo pelo logado".
3. **Cliente**: instalar `@supabase/supabase-js @supabase/ssr`; criar `lib/data/supabase/client.ts` (browser) e `server.ts`.
4. **SupabaseRepository** (`lib/data/supabase/repository.ts`): implementar TODA a interface `Repository`. Mapear snake_case ↔ camelCase num só lugar (`mappers.ts`). Gerar types com `supabase gen types typescript` (ou tool MCP) para tipar as queries.
5. **Troca de implementação**: provider decide por env `NEXT_PUBLIC_DATA_SOURCE=local|supabase`. Default `supabase`; `local` continua funcionando como fallback/offline.
6. **Migração de dados**: página/dialog "Importar meus dados locais" — lê o localStorage e insere tudo no Supabase (na ordem: subjects → topics → cycles → cycle_entries → blocks → sessions → reviews, remapeando ids). Idempotente (avisar se já há dados no servidor).
7. **UX de rede**: estados de loading (skeletons) nas listas/calendário e toasts de erro nas mutações (o Repository agora é async de verdade — a interface já devia ser async desde a fase 2; se não for, ajustar agora).

## Testes (TDD)
- **Antes de implementar**: testes Vitest dos `mappers.ts` (snake_case ↔ camelCase, campos null, ida-e-volta sem perda).
- **Ao final**: rodar TODA a suíte e2e existente (fases 1–6) com `DATA_SOURCE=supabase` contra um **banco de teste** (branch do Supabase ou schema de teste — nunca dados reais do projeto novo em produção) + spec nova da importação de dados locais. Suíte também deve continuar verde com `DATA_SOURCE=local`.

## Critérios de aceite
- [ ] Todas as features (matérias, ciclo, calendário com drag & drop, sessões, cronômetro, revisões, dashboard) funcionam iguais com `DATA_SOURCE=supabase`.
- [ ] Dados aparecem nas tabelas do Supabase (verificar no dashboard/SQL).
- [ ] Importação traz os dados locais preservando vínculos (sessão → bloco, review → sessão).
- [ ] Refresh e outra máquina/navegador veem os mesmos dados.
- [ ] Nenhuma credencial commitada; `get_advisors` do Supabase sem alertas críticos de segurança.
- [ ] Confirmado que NENHUMA operação tocou os projetos `bjglagkkodzlzlbnpwgp`, `pzxwxrxocksfknvqcmnu` ou `yvjjatlindmruqmlmqpg` — todas as operações usaram a ref do projeto novo.

## Não fazer
- Telas de login/cadastro reais (fase 8). Realtime/subscriptions (não é necessário).
