# Bloco 04 — Validação TLS e revisão pré-migration

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Confirmar que a conexão externa com o MySQL da Clever Cloud utiliza transporte seguro, realizar a revisão final da migration inicial e produzir evidências para uma futura decisão de aplicação, sem alterar o banco.

## 2. Contexto

O Bloco 03 (`bloco_03_modelagem_inicial_do_dominio_financeiro`) foi aprovado, corrigido e integrado à `main` (merge `a73b610`). A migration inicial (`database/migrations/0000_initial_financial_domain.sql`) está gerada e revisada, mas nunca foi aplicada. A inspeção do Bloco 02 usou `DATABASE_SSL=false` apenas para ler metadados — antes de qualquer dado real, é preciso confirmar se a conexão real suporta/usa TLS. Este bloco resolve essa lacuna e prepara (sem executar) o plano de aplicação da migration.

## 3. Problema que Este Bloco Resolve

Sem confirmar transporte seguro, aplicar a migration e inserir dados financeiros reais correria o risco de trafegar informação sensível sem criptografia entre a futura aplicação (Vercel) e o MySQL (Clever Cloud). Este bloco resolve a incerteza sobre TLS antes de qualquer decisão de aplicar a migration.

## 4. Escopo

- Validar configuração local de SSL/TLS (sem exibir valores)
- Testar conectividade segura (conexão única, timeout curto, somente leitura)
- Identificar se a sessão MySQL está usando criptografia
- Registrar versão e características do transporte (sanitizado)
- Revisar novamente a migration (compatibilidade MySQL 8.4.2, ordem de criação, constraints)
- Produzir plano de aplicação (documentado, não executado)
- Produzir plano de rollback compatível com banco vazio (documentado, não executado)
- Documentar evidências sanitizadas

## 5. Fora de Escopo

- Aplicar a migration (`drizzle-kit migrate`)
- `drizzle-kit push`
- Executar o SQL manualmente
- Criar tabelas, inserir dados, executar seeds
- Criar usuários reais, implementar autenticação
- Alterar configurações da Clever Cloud

## 6. Arquivos e Pastas Envolvidos

- `database/inspection/test-tls.ts` (novo — script de diagnóstico de TLS, somente leitura)
- `database/current-schema/tls-inspection.md` (novo — evidências sanitizadas)
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_04_validacao_tls_e_revisao_pre_migration.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_04_validacao_tls_e_revisao_pre_migration.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_04_validacao_tls_e_revisao_pre_migration.md`
- `database/migrations/0000_initial_financial_domain.sql` (leitura apenas — revisão, não alteração)
- Não tocar em `apps/api/.env.local`, `apps/api/src/db/schema/**`

## 7. Dependências

- Bloco 03 mesclado na `main` (`a73b610`)
- Credenciais já preenchidas em `apps/api/.env.local` (preenchidas pelo proprietário no Bloco 02)
- `mysql2` já disponível (workspace `database/inspection`)

## 8. Plano de Implementação

1. Confirmar `apps/api/.env.local` ignorado pelo Git (`git check-ignore -v`).
2. Escrever `database/inspection/test-tls.ts`: conexão única, timeout curto, `SELECT 1`, `SELECT VERSION()`, `SELECT DATABASE()`, e consultas de status do MySQL que revelam se a sessão atual usa TLS (`SHOW STATUS LIKE 'Ssl_cipher'` ou equivalente via `SHOW SESSION STATUS`), sem tocar em tabelas da aplicação.
3. Executar o script e capturar apenas resultados sanitizados (sim/não, versão, cifra — nunca host/usuário/senha/banco).
4. Revisar `database/migrations/0000_initial_financial_domain.sql` linha a linha contra a checklist da seção "Escopo".
5. Escrever plano de aplicação e rollback em `database/current-schema/tls-inspection.md` (ou arquivo próprio) — documentação apenas, nenhum comando executado.
6. Gerar e preencher o feedback oficial do bloco.

## 9. Critérios de Aceite

- [ ] Script de teste TLS não expõe nenhum valor de credencial em nenhuma saída
- [ ] Conexão de teste é única, com timeout, fechada em `finally`, sem escrita
- [ ] Resultado do TLS registrado (ativo/inativo) com evidência sanitizada
- [ ] Migration revisada novamente contra a checklist completa
- [ ] Plano de aplicação e rollback documentados, sem execução
- [ ] Nenhuma tabela criada, nenhum dado inserido, nenhuma migration aplicada

## 10. Validações Obrigatórias

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npx drizzle-kit check`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`

## 11. Segurança

Este bloco conecta a um banco de produção real. Regras: credenciais nunca exibidas (nem parcialmente); apenas status "configurado"/"ausente"; conexão única, somente leitura, com timeout curto; nenhuma consulta a tabelas de aplicação; erros sanitizados; se TLS não estiver ativo, nenhuma correção automática é aplicada — apenas registro e parada.

## 12. Performance

Não aplicável — uma única conexão de diagnóstico, sem carga relevante.

## 13. Design System / UX

Não aplicável.

## 14. Riscos

- TLS pode não estar ativo na configuração atual (`DATABASE_SSL=false` usado no Bloco 02) — se confirmado, bloqueia a aplicação da migration até resolução.
- Migration pode ter ficado desatualizada em relação ao schema TypeScript se algo mudou depois do Bloco 03 — mitigado por rodar `drizzle-kit check` novamente.

## 15. Pendências Esperadas

- P2 — Caso TLS não esteja ativo, aplicação da migration permanece bloqueada até configuração segura ser confirmada.
- P2 — Autorização final para aplicar a migration depende do proprietário, mesmo com TLS confirmado.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_04_validacao_tls_e_revisao_pre_migration --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(validacao_tls_e_revisao_pre_migration): _..._
```
