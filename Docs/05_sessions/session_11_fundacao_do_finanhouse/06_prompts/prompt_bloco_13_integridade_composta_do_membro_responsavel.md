# Prompt — Bloco 13: Integridade composta do membro responsável

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_13_integridade_composta_do_membro_responsavel.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Eliminar a pendência P2 relacionada a `financial_entries.responsible_member_id`, garantindo diretamente no MySQL que o membro responsável pertence ao mesmo household da movimentação, via migration incremental versionada, auditada e aplicada exclusivamente em `finanhouse_dev`.

## 3. Escopo

Coluna auxiliar `responsible_member_household_id`; FK composta `(responsible_member_id, responsible_member_household_id) → household_members(id, household_id)`; `CHECK` de consistência; `unique(id, household_id)` em `household_members`; migration incremental sem alterar a migration inicial; auditor de integridade específico com testes; checkpoint humano obrigatório; DT-09; encerramento da P2 nos Blocos 03/04.

## 4. Fora de Escopo

Repositórios Drizzle reais; endpoints de API; integração do frontend; `category_budgets`; `finanhouse_prod`; seed; alteração da migration inicial; criação de um Bloco 14.

## 5. Arquivos Permitidos

- `apps/api/src/db/schema/financial-entries.ts`, `household-members.ts` (+ testes)
- `apps/api/src/db/responsible-member-integrity-audit.ts` (+ teste), `apps/api/scripts/db-audit-responsible-member-integrity.ts`
- `database/migrations/0001_responsible_member_household_integrity.sql` (gerado, nunca editado à mão)
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_banco_dados.md`, `Docs/01_product/requisitos_funcionais.md`
- `database/proposed-schema/`, `database/migrations/README.md`
- `README.md`, `apps/api/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- Correção pontual, se necessária, nos scripts de banco existentes (`db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `db-audit-schema.ts`) — apenas se um defeito objetivo for encontrado.
- Nenhum arquivo de `database/migrations/0000_initial_financial_domain.sql` ou seu snapshot.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Checkpoint humano obrigatório antes de qualquer escrita remota (frase exata "AUTORIZO MIGRATION RESPONSIBLE_MEMBER FINANHOUSE_DEV"); nunca ler/exibir `apps/api/.env.local` ou o certificado CA; nunca usar `avnadmin`/`defaultdb`/MySQLx/`DATABASE_SSL=false`/`rejectUnauthorized=false`/`drizzle-kit push`; migration aplicada exatamente uma vez por tentativa válida; nenhuma escrita em produção; qualquer exibição de erro bruto de banco exige autorização pontual e explícita separada.

## 8. Restrições de Performance

Não aplicável — DDL aplicado uma vez; nenhuma consulta de aplicação introduzida.

## 9. Restrições de Design System

Não aplicável — nenhuma alteração de interface.

## 10. Tarefas

1. Diagnóstico inicial do git e criação de branch/bloco/prompt.
2. Inspeção do modelo atual antes de qualquer conexão.
3. Implementação do schema (coluna auxiliar, FK composta, CHECK, índice) e testes estáticos.
4. Geração da migration incremental (`drizzle-kit generate`), revisão estática, `drizzle-kit check`.
5. Implementação do auditor de integridade (puro + CLI) e testes.
6. Validações locais completas; pré-flight real somente leitura.
7. Checkpoint obrigatório; aguardar autorização.
8. Aplicação da migration; diagnóstico e correção caso falhe; recuperação controlada se necessário, com autorização separada; reaplicação.
9. Auditoria pós-migration; documentação (DT-09); encerramento da P2; feedback DDAE.
10. Validações finais, revisão de segurança, commit, push, integração à `main`.

## 11. Critérios de Aceite

- [x] Migration inicial não alterada; migration incremental aplicada com sucesso, somente em `finanhouse_dev`.
- [x] FK composta com `DELETE_RULE` documentado e justificado; `CHECK` presente; coluna auxiliar nullable.
- [x] P2 do membro responsável encerrada; RF-05 não declarado concluído.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `ddae-engine audit`
- [x] `npm run build`, `npm run lint`, `npm run typecheck`, `npm run typecheck:api-scripts`, `npm run test`
- [x] `npx drizzle-kit check`
- [x] `npm audit --omit=dev`, `npm audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_13_integridade_composta_do_membro_responsavel --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(database): garantir integridade do membro responsável
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
