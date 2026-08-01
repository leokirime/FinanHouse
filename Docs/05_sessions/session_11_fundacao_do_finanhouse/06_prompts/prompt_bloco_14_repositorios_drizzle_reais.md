# Prompt — Bloco 14: Repositórios Drizzle reais

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_14_repositorios_drizzle_reais.md`
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-08, DT-09) e `Docs/03_contracts/contrato_banco_dados.md`

## 2. Objetivo

Implementar os adaptadores Drizzle/MySQL reais para as portas de repositório já existentes no domínio e na camada de aplicação, conectando a arquitetura já modelada ao schema aplicado no Aiven.

## 3. Escopo

Adaptadores Drizzle reais para `FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryRepository`, `HouseholdMemberRepository`; fábrica de injeção de dependência; mapeadores de dados; isolamento por household nas leituras e nas escritas; tratamento da coluna auxiliar do membro responsável (DT-09); tradução sanitizada de erros; testes unitários sem conexão real; script de smoke-test transacional com checkpoint humano obrigatório.

## 4. Fora de Escopo

Endpoints HTTP, integração do frontend com a API, remoção do modo demonstrativo, seed, migration nova, alteração de schema, criação do Bloco 15.

## 5. Arquivos Permitidos

- `apps/api/src/infrastructure/repositories/drizzle/**`
- `apps/api/src/db/sanitize-error.ts`, `apps/api/src/db/smoke-repositories-guard.ts` (+ testes)
- `apps/api/scripts/db-smoke-repositories.ts`
- `apps/api/scripts/db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `db-audit-schema.ts`, `db-audit-responsible-member-integrity.ts` (só o import de `categorizeConnectionError`)
- `apps/api/package.json`, `package.json` (raiz)
- Documentação: `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/01_product/requisitos_funcionais.md`, `Docs/03_contracts/contrato_banco_dados.md`, `README.md`, `apps/api/README.md`, `apps/api/src/application/README.md`, `apps/api/src/infrastructure/README.md`, documentos deste bloco/sessão

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão.
- Siga as convenções já estabelecidas pelos repositórios em memória e pelos scripts de banco existentes.
- Registre toda pendência encontrada com prioridade P1–P4.
- Checkpoint humano obrigatório antes de qualquer escrita real no banco (smoke-test).

## 7. Restrições de Segurança

Nunca exibir host, porta, usuário, senha, Service URI, configuração do pool ou o objeto bruto do mysql2. Erros de driver sempre traduzidos via `translatePersistenceError`/`categorizeConnectionError` antes de qualquer log. O smoke-test usa exclusivamente dados sintéticos com domínio `.invalid`, dentro de uma transação sempre revertida.

## 8. Restrições de Performance

`nextId()` via `information_schema` não deve ser apresentado como estratégia definitiva de concorrência em produção — documentar essa limitação explicitamente no código.

## 9. Restrições de Design System

Não aplicável — nenhuma alteração de interface.

## 10. Tarefas

1. Inspecionar a arquitetura existente (portas, serviços, repositórios em memória, schema).
2. Implementar mapeadores, tradução de erros, os quatro repositórios e a fábrica.
3. Escrever testes unitários sem conexão real.
4. Implementar o smoke-test transacional.
5. Validar localmente e fazer o pré-flight somente leitura.
6. Apresentar checkpoint e aguardar autorização explícita.
7. Executar o smoke-test autorizado; auditar novamente.
8. Documentar e criar o feedback DDAE.
9. Validações finais, revisão de segurança, commit, push, merge.

## 11. Critérios de Aceite

- [x] As quatro portas existentes têm adaptador Drizzle real.
- [x] Escrita sempre escopada por `household_id`, sem upsert.
- [x] Coluna auxiliar do membro responsável nunca exposta ao domínio.
- [x] Smoke-test aprovado com rollback e zero dado residual.

## 12. Validações Locais Obrigatórias

- [x] `ddae-engine validate`
- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts`
- [x] `npm run test`
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine audit`
- [x] `npm audit --omit=dev`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_14_repositorios_drizzle_reais --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Status: Aprovado — smoke-test transacional aprovado em todos os passos, zero dado residual, 654+ testes preservados/novos aprovados.

## 15. Commit Semântico Sugerido

```
feat(api): implementar repositórios Drizzle reais
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
