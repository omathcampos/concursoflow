# 01 — Requisitos

## Visão

App de cronograma de estudos para concursos, muito completo: ciclo de estudos, calendário remanejável, registro detalhado de sessões, revisões espaçadas e dashboard de estatísticas. Multi-usuário ao final (Supabase Auth).

## Personas

- **Concurseiro solo (Matheus)**: estuda com Tec Concursos (questões) e Estratégia (aulas/PDFs), quer planejar a semana, registrar o que estudou e ver evolução.
- **Usuário cadastrado (futuro)**: qualquer pessoa cria conta e tem seus próprios dados isolados.

## Requisitos Funcionais

### RF01 — Matérias e tópicos
- CRUD de matérias com nome, cor (paleta pré-definida), peso/prioridade (1–5) e campo de observações.
- Cada matéria tem tópicos (edital verticalizado simplificado) com status: não iniciado / estudando / concluído — e observações por tópico (ex.: "cai muito na FGV", "refazer questões").

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

### RF08 — Notificações por email e Telegram (v1.1, fase 10)
- Lembrete diário de manhã (blocos do dia + revisões), horário configurável por usuário.
- Relatório semanal aos domingos (horas, Δ vs. semana anterior, % acerto, streak, matérias atrasadas).
- Alerta de revisões vencidas há 2+ dias (máx. 1 a cada 3 dias).
- Canais: email (Resend) e Telegram bot (vínculo via /start com código; /stop desvincula), escolhíveis por usuário.
- Preferências por usuário (toggles, canais, horário, timezone) e descadastro por link sem login.
- Infra: Resend + Telegram Bot API + Supabase Edge Functions + pg_cron; conteúdo montado uma vez e despachado por canal.

### RF09 — Caderno de Anotações e melhorias (fase 11, pós-v1.1)
- Página "Anotações": criar/editar/excluir anotações com título e conteúdo em markdown (editor simples com preview).
- Anotação pode ser avulsa ou vinculada a matéria e/ou tópico; lista filtrável por matéria e busca por texto.
- Atalhos: criar anotação a partir do card da matéria e do popover do bloco no calendário.
- Observações em matérias e tópicos (campos `notes`).
- Modo foco do cronômetro: tela cheia com tempo gigante, sem distrações, Wake Lock no mobile.

## Backlog — features futuras (pós-v1.1)

- **Anexar arquivos**: upload de PDFs, resumos, mapas mentais e imagens vinculados a matérias, tópicos ou sessões (ex.: o PDF do Estratégia daquele tópico, foto do caderno de erros). Infra: Supabase Storage com bucket privado por usuário (RLS), preview de PDF/imagem no app, limite de tamanho por arquivo e quota por usuário. Especificar como fase 11 quando chegar a hora.

## Fora de escopo (v1)

- Sincronização automática com Tec/Estratégia (não há API pública — registro é manual).
- App mobile nativo, notificações push, planos pagos, compartilhamento social.
