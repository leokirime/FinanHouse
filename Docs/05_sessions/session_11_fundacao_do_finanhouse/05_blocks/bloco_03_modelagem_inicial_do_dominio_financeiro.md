# Bloco 03 — Modelagem inicial do domínio financeiro

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Definir o primeiro modelo de dados do Finanhouse, formalizar a estratégia de persistência (Drizzle + mysql2), implementar o schema tipado e gerar uma migration inicial revisável, sem aplicá-la ao MySQL.

## 2. Contexto

O Bloco 02 (`bloco_02_inventario_seguro_do_banco_existente`) confirmou que o MySQL da Clever Cloud existe mas está estruturalmente vazio (0 tabelas) — não há schema legado a preservar. Isso libera a modelagem do domínio financeiro do zero. O proprietário aprovou a proposta técnica registrada no feedback do Bloco 02 e formalizou a escolha: Drizzle ORM como camada tipada + mysql2 como driver.

## 3. Problema que Este Bloco Resolve

Sem um schema definido, nenhuma feature real (movimentações, competências, planejamento) pode ser implementada. Este bloco resolve a ausência de modelo de dados, mas de forma proposta e revisável — sem comprometer o banco real antes que o proprietário revise o SQL gerado.

## 4. Escopo

- Corrigir a dependência do script `database/inspection/inspect-database.ts` (deixar de depender de hoisting incidental do npm)
- Instalar `drizzle-orm` e `mysql2` (dependência) e `drizzle-kit` (devDependency) em `apps/api`
- Formalizar a decisão de persistência: ADR dedicado + atualização de `decisoes_tecnicas.md`, `contrato_banco_dados.md`, `registro_decisoes.md`
- Registrar a ressalva de TLS (Vercel → MySQL Clever Cloud) como pendência P2
- Modelar 6 tabelas iniciais (`users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`) como schema Drizzle tipado em `apps/api/src/db/schema/`
- Configurar `drizzle.config.ts` (sem credenciais, sem conexão durante `generate`)
- Gerar a migration inicial via `drizzle-kit generate` (arquivo SQL revisável, não aplicado)
- Criar `database/proposed-schema/` com documentação do modelo lógico, relacionamentos e extensões futuras
- Criar testes mínimos que validam o schema e a migration sem acessar o banco
- Criar tipos de domínio mínimos em `packages/domain/src/`

## 5. Fora de Escopo

- Aplicar a migration no MySQL (`drizzle-kit migrate`, `drizzle-kit push`) — requer autorização explícita futura
- Verificação/configuração final de TLS entre Vercel e Clever Cloud — fica como pendência P2 para bloco futuro
- `recurrence_rules`, `installment_plans`, `category_budgets`, `period_status_history` — documentadas como extensões futuras
- Autenticação, tokens, recuperação de senha, logs de auditoria completos
- Qualquer conexão com o banco real neste bloco
- Seed de dados

## 6. Arquivos e Pastas Envolvidos

- `apps/api/drizzle.config.ts`
- `apps/api/src/db/schema/{users,households,household-members,categories,monthly-periods,financial-entries,index}.ts`
- `apps/api/src/db/relations.ts`, `apps/api/src/db/types.ts`
- `apps/api/package.json` (dependências Drizzle)
- `database/proposed-schema/{README,modelo-logico,relacionamentos,extensoes-futuras}.md`
- `database/migrations/` (migration gerada pelo `drizzle-kit`)
- `packages/domain/src/{financial-entry,monthly-period,category,index}.ts`
- `database/inspection/inspect-database.ts` e `package.json` (correção de dependência)
- Não tocar em `database/current-schema/` (representa apenas o estado real encontrado no banco)

## 7. Dependências

- Bloco 02 concluído, commitado e enviado (`449e4f3`)
- Aprovação do proprietário para Drizzle + mysql2 (registrada nesta conversa)
- `Docs/03_contracts/contrato_banco_dados.md` — regras do banco existente (ainda vazio)

## 8. Plano de Implementação

1. Corrigir a dependência do script de inspeção (declarar `mysql2` explicitamente disponível para `database/inspection`, não depender de hoisting incidental).
2. Instalar `drizzle-orm`, `mysql2` (dependencies) e `drizzle-kit` (devDependency) em `apps/api`.
3. Criar o ADR de persistência e atualizar os documentos de governança/arquitetura/contrato.
4. Modelar as 6 tabelas em `apps/api/src/db/schema/` com Drizzle.
5. Criar `apps/api/src/db/relations.ts` e `apps/api/src/db/types.ts`.
6. Configurar `apps/api/drizzle.config.ts` apontando para o schema e para `database/migrations/`.
7. Rodar `drizzle-kit generate` para gerar a migration inicial (sem aplicar).
8. Revisar o SQL gerado (tabelas, índices, constraints, FKs, ON DELETE/UPDATE, ausência de comandos destrutivos).
9. Criar `database/proposed-schema/` com a documentação do modelo lógico.
10. Criar `packages/domain/src/` com os tipos de domínio mínimos.
11. Criar testes mínimos (sem acesso ao banco).
12. Gerar e preencher o feedback oficial do bloco.

## 9. Critérios de Aceite

- [ ] Seis tabelas modeladas no schema Drizzle
- [ ] `drizzle.config.ts` não contém credenciais e não conecta ao banco durante `generate`
- [ ] Migration inicial gerada como arquivo SQL, não aplicada
- [ ] SQL gerado não contém `DROP`, `TRUNCATE`, `DELETE`, `UPDATE`, dados reais, credenciais, host ou nome do banco
- [ ] Valores monetários usam `DECIMAL(13,2)`, nunca `FLOAT`/`DOUBLE`
- [ ] ADR de persistência criado e decisões de governança atualizadas
- [ ] Ressalva de TLS registrada como pendência P2
- [ ] `database/current-schema/` permanece inalterado (continua refletindo banco vazio)
- [ ] Testes mínimos passam sem conectar ao banco
- [ ] Nenhuma migration aplicada, nenhuma tabela criada no MySQL real

## 10. Validações Obrigatórias

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] Comando oficial de validação de schema/migration do Drizzle (sem conectar ao banco)

## 11. Segurança

`drizzle.config.ts` não deve conter credenciais nem carregar `apps/api/.env.local` para gerar o schema/migration (geração é estática, a partir do TypeScript, sem conexão). TLS entre a futura aplicação na Vercel e o MySQL da Clever Cloud precisa ser verificado antes de qualquer inserção de dado real — registrado como pendência P2, não resolvido neste bloco. Nenhum dado pessoal ou financeiro real é inserido.

## 12. Performance

Não aplicável — este bloco não executa consultas, apenas define schema estático e gera SQL de migration.

## 13. Design System / UX

Não aplicável — bloco não toca em `apps/web` nem em UI.

## 14. Riscos

- Migration gerada pode conter suposições erradas sobre tipos/constraints que só se revelam ao ser revisada — mitigado por revisão explícita do SQL antes de qualquer aplicação futura.
- Confusão entre `database/current-schema/` (estado real) e o schema proposto — mitigado por manter o schema proposto em `database/proposed-schema/`, pasta separada.
- Falsa sensação de que o schema já existe no banco — mitigado por usar linguagem explícita ("proposto", "gerado, não aplicado") em toda a documentação.

## 15. Pendências Esperadas

- P2 — Verificação de TLS/SSL entre a futura aplicação (Vercel) e o MySQL da Clever Cloud, antes da primeira migration real e antes de inserir dados reais.
- P2 — Aplicação da migration inicial depende de revisão e autorização explícita do proprietário.
- P3 — Extensões futuras (`recurrence_rules`, `installment_plans`, `category_budgets`, `period_status_history`) documentadas mas não modeladas.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_03_modelagem_inicial_do_dominio_financeiro --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(modelagem_inicial_do_dominio_financeiro): _..._
```
