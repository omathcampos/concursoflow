# 📚 ConcursoFlow

**Cronograma de estudos inteligente para concurseiros.** Planeje sua semana, registre cada sessão de estudo, nunca perca uma revisão e acompanhe sua evolução até a aprovação.

> Feito para quem estuda com Tec Concursos (questões) e Estratégia Concursos (aulas/PDFs) — mas serve para qualquer rotina de estudos.

## ✨ Features

- **Ciclo de estudos** — defina horas-alvo por matéria e siga o rodízio; o app sugere o que estudar agora com base no seu progresso e nos pesos do edital.
- **Calendário remanejável** — vista semanal e mensal com blocos de estudo que você arrasta, redimensiona e reagenda livremente. Recorrência semanal incluída.
- **Registro de sessões** — manual ou via cronômetro integrado. Questões feitas e % de acerto (Tec), páginas/aulas (Estratégia), comentários.
- **Revisões espaçadas** — ao concluir teoria, revisões em 24h, 7 dias e 30 dias são agendadas automaticamente e aparecem no seu dia.
- **Dashboard** — horas por matéria, evolução semanal, % de acerto, distribuição por tipo de estudo e streak de dias consecutivos. 🔥
- **Countdown da prova** — dias restantes até a data do seu concurso, sempre visível.
- **Multi-usuário** — crie sua conta e acesse de qualquer lugar; seus dados são só seus.
- **Tema Claro/Escuro/Sistema.**

## 🛠️ Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zustand · @dnd-kit · Recharts · Supabase (Postgres + Auth + RLS) · Vercel

## 🚀 Rodando localmente

```bash
git clone <url-do-repo>
cd concursoflow
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

Variáveis necessárias (a partir da fase 7):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DATA_SOURCE=supabase   # ou "local" para rodar offline com localStorage
```

## 🗺️ Roadmap / Status

O desenvolvimento segue fases documentadas em [`PLANO.md`](./PLANO.md) e `prompts/`:

- [ ] Fase 0 — Repositório, Git Flow e CI
- [ ] Fase 1 — Setup Next.js + design system
- [ ] Fase 2 — Matérias e ciclo de estudos
- [ ] Fase 3 — Calendário com drag & drop
- [ ] Fase 4 — Sessões + cronômetro
- [ ] Fase 5 — Revisões espaçadas
- [ ] Fase 6 — Dashboard
- [ ] Fase 7 — Supabase
- [ ] Fase 8 — Autenticação
- [ ] Fase 9 — Polimento + deploy (v1.0.0)

*(marcar a caixinha no PR de cada fase)*

## 🤝 Contribuindo

Fluxo de branches, commits e releases em [`CONTRIBUTING.md`](./CONTRIBUTING.md) (criado na fase 0).

## 📄 Licença

Projeto pessoal — todos os direitos reservados.
