# Prompt — Bloco 12: Aplicação e auditoria da migration inicial no Aiven

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Aplicar de forma controlada a migration inicial versionada no banco de desenvolvimento `finanhouse_dev`, auditar o schema resultante, registrar as evidências operacionais, encerrar a P2 referente à migration inicial e integrar o bloco à main.

## 3. Escopo

Inspeção e revisão estática da migration; script reutilizável de auditoria de schema (`db-audit-schema.ts` + `schema-audit.ts`) com testes unitários; checkpoint humano obrigatório antes de qualquer escrita remota; aplicação única da migration versionada; auditoria pós-migration; documentação (DT-08, contratos, READMEs, RF-05); encerramento exclusivo da P2 de migration.

## 4. Fora de Escopo

Seed de dados sintéticos; repositórios Drizzle reais; endpoints de API; integração do frontend; `category_budgets` ou qualquer tabela nova; `finanhouse_prod`; qualquer alteração em produção; criação de um Bloco 13.

## 5. Arquivos Permitidos

- `apps/api/scripts/db-audit-schema.ts`, `apps/api/src/db/schema-audit.ts` (+ teste)
- `apps/api/package.json`, `package.json` (raiz)
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_banco_dados.md`, `Docs/03_contracts/contrato_variaveis_ambiente.md`, `Docs/01_product/requisitos_funcionais.md`
- `README.md`, `apps/api/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- Arquivos DDAE da própria sessão/bloco (`05_blocks/`, `06_prompts/`, `08_feedbacks/`)
- Nenhum arquivo de schema Drizzle nem de migration SQL — a migration já existia, versionada, desde o Bloco 03.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Checkpoint humano obrigatório antes de qualquer escrita remota (frase exata "AUTORIZO MIGRATION FINANHOUSE_DEV"); nunca ler/exibir `apps/api/.env.local` ou o certificado CA; nunca usar `avnadmin`/`defaultdb`/MySQLx/`DATABASE_SSL=false`/`rejectUnauthorized=false`/`drizzle-kit push`; migration aplicada exatamente uma vez; nenhuma escrita em produção.

## 8. Restrições de Performance

Não aplicável — uma única migration DDL aplicada uma vez; nenhuma consulta de aplicação introduzida.

## 9. Restrições de Design System

Não aplicável — nenhuma alteração de interface.

## 10. Tarefas

1. Diagnóstico inicial do git e criação de branch/bloco/prompt.
2. Inspeção de scripts/contratos existentes antes de qualquer conexão.
3. Revisão estática da migration (6 tabelas, hash SHA-256, ausência de comandos destrutivos).
4. Implementação do script de auditoria de schema (puro + CLI) e testes.
5. Validações locais completas.
6. Pré-flight real somente leitura (`db:check` + auditoria `before`).
7. Checkpoint obrigatório — aguardar autorização explícita do proprietário.
8. Após autorização: revalidação, aplicação única da migration, auditoria `after`.
9. Documentação, encerramento da P2 de migration, feedback DDAE.
10. Validações finais, revisão de segurança, commit, push, integração à `main`.

## 11. Critérios de Aceite

- [x] Migration aplicada uma única vez, somente em `finanhouse_dev`.
- [x] Seis tabelas criadas, todas com zero registros; journal com uma migration registrada.
- [x] Nenhum seed executado; nenhuma credencial exibida; P2 de migration encerrada.

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
ddae-engine feedback create --block bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
chore(database): aplicar migration inicial no Aiven DEV
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
