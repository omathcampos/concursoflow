# FASE 16 — Anexos (Supabase Storage)

## Contexto
App em produção. Leia o `CLAUDE.md` e siga todas as regras (Repository/cache, TDD, migrations no `MIGRATIONS.md`, Git Flow). Feature que estava no backlog dos requisitos. Release: bump minor.

> ⚠️ Operações Supabase apenas na ref `apceuvnqnrxfoongjvxq`.

## Objetivo
Anexar arquivos (PDFs, imagens, resumos, mapas mentais) a **matérias, tópicos, sessões e anotações**, com armazenamento privado por usuário no Supabase Storage.

## Tarefas
1. **Storage**: bucket `attachments` PRIVADO. Policies de Storage por dono via path `{user_id}/...` (upload/select/delete apenas do próprio prefixo). Limites: 10MB por arquivo; tipos permitidos: pdf, png, jpg, webp, md, txt (validar no client E nas policies/config do bucket). Quota simples por usuário (ex.: 200MB) checada no client via listagem.
2. **Migration** (`supabase migration new attachments` + linha no `MIGRATIONS.md`): tabela `attachments` — id, user_id, storage_path, file_name, mime_type, size_bytes, e vínculo polimórfico simples: subject_id?, topic_id?, session_id?, annotation_id? (check: exatamente um preenchido). RLS padrão por user_id. Excluir a linha deve remover o objeto do Storage (fazer na camada Repository, não confiar só em trigger).
3. **Repository**: estender interface com attachments (list por entidade, upload com progresso, remove, getSignedUrl). Upload direto do client para o Storage (signed upload ou supabase-js), nunca passando pelo Next server.
4. **UI — componente `AttachmentList` reutilizável**:
   - Aparece em: card/detalhe da matéria, tópico (popover/expansão), SessionForm (edição) e editor de Anotações.
   - Dropzone + botão anexar, barra de progresso, lista com ícone por tipo, nome, tamanho, data.
   - Preview inline: imagem em lightbox; PDF em nova aba via signed URL (validade curta); demais, download.
   - Excluir com confirmação. Estados de erro claros (tamanho, tipo, quota, offline).
   - Contador discreto de anexos (📎 N) nos cards de matéria e nas listas de sessões/anotações.
5. **Modo local (`DATA_SOURCE=local`)**: anexos indisponíveis com aviso amigável (Storage exige nuvem) — não quebrar nada.
6. **Exportação de dados (fase 14)**: incluir aba "Anexos" (entidade, arquivo, tamanho, data) — sem os binários.

## Testes (TDD)
- **Antes**: Vitest das validações puras (tipo/tamanho/quota, regra do vínculo único) e dos mappers.
- **Ao final**: `e2e/fase-16-anexos.spec.ts` — upload em matéria e em anotação (fixture pequena), preview de imagem, download por signed URL, excluir remove da lista E do Storage, arquivo acima do limite é rejeitado com mensagem. Isolamento: usuário B não acessa signed URL/objeto de A (testar de verdade). Regressão: suíte completa verde.

## Critérios de aceite
- [ ] Upload/preview/download/exclusão funcionando nas 4 entidades, com progresso e erros claros.
- [ ] Bucket privado: URL direta sem assinatura retorna erro; isolamento entre usuários validado com 2 contas.
- [ ] Excluir anexo (ou a entidade pai) não deixa objeto órfão no Storage.
- [ ] Limites de tipo/tamanho aplicados; modo local degrada com aviso.
- [ ] Migration registrada no `MIGRATIONS.md`; advisors do Supabase sem alertas críticos.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` e `npm run e2e` limpos; release minor via Git Flow.
