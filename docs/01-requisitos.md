# 01 — Requisitos

## Visão

App de cronograma de estudos para concursos, muito completo: ciclo de estudos, calendário remanejável, registro detalhado de sessões, revisões espaçadas e dashboard de estatísticas. Multi-usuário ao final (Supabase Auth).

## Personas

- **Concurseiro solo (Matheus)**: estuda com Tec Concursos (questões) e Estratégia (aulas/PDFs), quer planejar a semana, registrar o que estudou e ver evolução.
- **Usuário cadastrado (futuro)**: qualquer pessoa cria conta e tem seus próprios dados isolados.

## Requisitos Funcionais

### RF01 — Matérias e tópicos
- CRUD de matérias com nome, cor (paleta pré-definida), peso/prioridade (1–5).
- Cada matéria tem tópicos (edital verticalizado simplificado) com status: não iniciado / estudando / concluído.

### RF02 — Ciclo de estudos
- Criar ciclo com matérias e carga-horária alvo por matéria (ex.: Português 6h, Direito Adm 8h...).
- Visualização do ciclo em barras de progresso: horas feitas vs. alvo na rodada atual.
- Ao completar a rodada, botão "reiniciar ciclo" zera o progresso (mantém histórico).
- Sugestão de "próxima matéria" = a com menor % de progresso ponderado por peso.

### RF03 — Calendário (núcleo do app)
- Vista semanal (principal) e mensal.
- Blocos de estudo agendados: matéria, tópico (opcional), horário início/fim, tipo (teoria, questões, revisão, lei seca, aula).
- **Remanejar por drag & drop**: arrastar bloco para outro dia/horário; redimensionar duração.
- Criar bloco clicando/arrastando em célula vazia.
- Status do bloco: planejado / concluído / pulado. Concluir um bloco gera (ou vincula) uma sessão de estudo.
- Blocos recorrentes simples (ex.: toda seg 19h–21h).

### RF04 — Registro de sessões
- Sessão: matéria, tópico, tipo, data, duração, e métricas por tipo:
  - **Questões (Tec)**: total feitas, acertos → % acerto calculado.
  - **Teoria/Aula (Estratégia)**: páginas lidas ou % da aula.
  - Comentário livre.
- Registro manual (formulário rápido) ou via **cronômetro** integrado (start/pause/stop → pré-preenche duração).
- Editar/excluir sessões; listagem com filtros (matéria, tipo, período).

### RF05 — Revisões espaçadas
- Ao concluir sessão de teoria (opt-in por sessão), agendar revisões automáticas: **24h, 7 dias, 30 dias**.
- Painel "Revisões de hoje" com pendentes/atrasadas; concluir revisão gera a próxima do ciclo.
- Revisões aparecem no calendário como blocos sugeridos (sem horário fixo, numa faixa "revisões do dia").

### RF06 — Dashboard
- Horas estudadas: hoje, semana, mês; comparativo com semanas anteriores.
- Gráfico de barras: horas por matéria (período selecionável).
- Gráfico de linha: evolução semanal de horas e de % de acerto.
- % de acerto por matéria (questões).
- **Streak** de dias consecutivos estudados.
- Distribuição por tipo de estudo (pizza/donut).

### RF07 — Cadastro e autenticação (ÚLTIMA fase)
- Sign-up com e-mail/senha (+ Google OAuth opcional) via Supabase Auth.
- Cada usuário vê apenas seus dados (RLS).
- Página de perfil: nome, concurso-alvo, data da prova (countdown no header).

## Requisitos Não-Funcionais

- **RNF01**: Design bonito e moderno — temas Claro/Escuro/Sistema (padrão: Sistema), Tailwind, micro-animações sutis. Ambos os temas com o mesmo nível de acabamento.
- **RNF02**: Responsivo (desktop-first, mas usável no celular; calendário vira lista de dia no mobile).
- **RNF03**: Fases 1–6 funcionam offline com localStorage; camada de dados abstraída para trocar por Supabase sem reescrever UI.
- **RNF04**: TypeScript estrito; sem `any` gratuito.
- **RNF05**: Performance: interações do calendário < 100ms; sem re-render em massa ao arrastar.
- **RNF06**: Acessibilidade básica: navegação por teclado no calendário, contraste AA, labels em formulários.
- **RNF07**: Qualidade: TDD (Vitest) nas regras de domínio e e2e (Playwright) ao final de cada feature, com regressão das anteriores — ver `docs/02-arquitetura.md`.

## Fora de escopo (v1)

- Sincronização automática com Tec/Estratégia (não há API pública — registro é manual).
- App mobile nativo, notificações push, planos pagos, compartilhamento social.
