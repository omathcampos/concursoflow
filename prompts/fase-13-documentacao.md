# FASE 13 — Documentação técnica e funcional (Fumadocs)

## Contexto
App completo em produção. Leia o `CLAUDE.md` do repo e siga todas as regras de lá. Fontes de conteúdo: `CLAUDE.md`, `README.md`, `MIGRATIONS.md`, `docs/` (requisitos, arquitetura, schema), `prompts/fase-XX-*.md` e o próprio código. Release: bump minor.

> ⚠️ Operações Supabase (se houver) apenas na ref `apceuvnqnrxfoongjvxq`.

## Objetivo
Documentação bonita e navegável com URL própria, usando **Fumadocs** (framework de docs para Next.js + Tailwind, estética shadcn — mesma linguagem visual do app), cobrindo o lado **funcional** (como usar) e o **técnico** (como funciona).

## Decisão de arquitetura
- Integrar o Fumadocs **no próprio app**, sob a rota `/docs` (fumadocs-ui + fumadocs-mdx, conteúdo em `content/docs/*.mdx`). Um deploy só, mesma URL base: `concursoflow-alpha.vercel.app/docs`.
- **Atenção ao proxy** (`src/proxy.ts`): `/docs` e assets do Fumadocs devem ser PÚBLICOS (sem exigir login) — ajustar o matcher e testar deslogado.
- Tema: reusar os tokens CSS do app (dark/light seguindo o mesmo seletor), logo e cores do ConcursoFlow. A doc deve parecer "do mesmo produto".
- Se a integração na app criar conflito insolúvel (ex.: versões de Tailwind/PostCSS), fallback: app Next separado em `apps-docs/` no mesmo repo, segundo projeto na Vercel (`concursoflow-docs`). Só ir para o fallback se necessário — justificar no PR.

## Estrutura do conteúdo

### 📖 Guia do usuário (funcional)
1. **Introdução** — o que é o ConcursoFlow, para quem, tour em 1 minuto.
2. **Primeiros passos** — criar conta, cadastrar matérias e tópicos (com pesos), montar o ciclo.
3. **Ciclo de estudos** — como funciona a sugestão "estude agora", rodadas, boas práticas de carga horária.
4. **Calendário** — criar/mover/redimensionar blocos, recorrência, tipos de estudo, concluir/pular, mobile.
5. **Sessões e cronômetro** — registro manual, timer, modo foco, questões (Tec) vs. teoria (Estratégia).
6. **Revisões espaçadas** — a lógica 24h/7d/30d, painel diário, o que fazer com atrasadas.
7. **Dashboard** — leitura de cada gráfico e do streak.
8. **Anotações** — caderno markdown, vínculos, atalhos.
9. **Notificações** — email/Telegram, vincular o bot, horários, descadastro.
10. **Exportar calendário** — assinar o feed no Google Agenda/Apple Calendar (com passo a passo e prints).
11. **FAQ** — fuso horário, dados offline vs. nuvem, privacidade (RLS), limites conhecidos (Resend sandbox etc.).
- Screenshots reais do app (capturar em dark mode, padronizadas) nos fluxos principais.

### 🔧 Referência técnica
1. **Visão geral da arquitetura** — diagrama (Mermaid, que o Fumadocs renderiza): Next.js → Repository → cache Zustand → Supabase; Edge Functions + pg_cron.
2. **Stack e decisões** — tabela do porquê de cada escolha (importar de docs/02-arquitetura.md, atualizada com as decisões reais: cache reativo, Base UI, proxy do Next 16, React Compiler).
3. **Repository Pattern** — interface, as duas implementações, regra "leitura síncrona/mutação assíncrona", como adicionar uma entidade nova (passo a passo).
4. **Domínio** — cada módulo de `lib/domain/` com assinatura, regras e exemplos (ciclo, revisões, streak, overlap, stats, ical, notifications).
5. **Banco de dados** — schema com diagrama ER (Mermaid), RLS, triggers, política de migrations + MIGRATIONS.md.
6. **Edge Functions** — as 5 functions, fluxo do cron, CORS, secrets, a regra da duplicação Deno/app documentada no CLAUDE.md.
7. **Testes** — estratégia TDD, como rodar, estrutura dos e2e por fase, cobertura.
8. **Git Flow e releases** — fluxo de branches, CI, versionamento.
9. **Rodando localmente** — setup completo, envs, DATA_SOURCE local vs. supabase.
10. **Histórico de fases** — resumo de cada fase (0–13) com o que entregou, linkando os prompts.

## Tarefas
1. Instalar/configurar Fumadocs na rota `/docs`, tema alinhado ao app, busca funcionando, sidebar com as duas seções acima, dark/light.
2. Escrever TODO o conteúdo em MDX pt-BR (denso e útil, não lorem ipsum) a partir das fontes reais — em caso de conflito entre docs antigos e código, o **código vence** (e atualizar `docs/` da pasta de planejamento é bônus).
3. Capturar screenshots reais (Playwright pode automatizar) e gerar os diagramas Mermaid.
4. Liberar `/docs` no proxy (público), link "Documentação" no rodapé/menu do app e no README.
5. Validar deslogado em produção: navegação, busca, imagens, dark/light, mobile.

## Testes
- **Ao final**: `e2e/fase-13-docs.spec.ts` — `/docs` abre SEM login, busca retorna resultado, navegação entre páginas das duas seções, imagens carregam, tema alterna. Regressão: suíte completa verde (especialmente auth — garantir que liberar /docs não abriu nenhuma rota do app).

## Critérios de aceite
- [ ] `/docs` pública, bonita e coerente com o visual do app nos dois temas.
- [ ] Todas as páginas das duas seções escritas com conteúdo real (zero placeholders), screenshots e diagramas renderizando.
- [ ] Busca funciona; mobile confortável.
- [ ] Nenhuma rota autenticada foi exposta pela mudança no proxy (testar deslogado).
- [ ] Link para a doc no app e no README.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos; release minor via Git Flow.
