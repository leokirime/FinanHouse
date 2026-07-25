# Prompt — Bloco 03: Modelagem inicial do domínio financeiro

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_03_modelagem_inicial_do_dominio_financeiro.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Definir o primeiro modelo de dados do Finanhouse, formalizar a estratégia de persistência (Drizzle + mysql2), implementar o schema tipado e gerar uma migration inicial revisável, sem aplicá-la ao MySQL.

## 3. Escopo

Instalar Drizzle/mysql2/drizzle-kit; ADR de persistência; modelar 6 tabelas (`users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`); `drizzle.config.ts`; gerar migration inicial (não aplicar); documentação do schema proposto; testes mínimos sem acesso ao banco.

## 4. Fora de Escopo

Aplicar migration; conectar ao banco; criar tabelas reais; seed; verificação final de TLS; autenticação; `recurrence_rules`/`installment_plans`/`category_budgets`/`period_status_history`.

## 5. Arquivos Permitidos

- `apps/api/drizzle.config.ts`, `apps/api/src/db/**`, `apps/api/package.json`
- `database/proposed-schema/**`, `database/migrations/**` (apenas arquivos gerados pelo drizzle-kit)
- `database/inspection/**` (somente para corrigir a dependência do mysql2)
- `packages/domain/src/**`
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`, `Docs/03_contracts/contrato_banco_dados.md`, `Docs/04_governance/registro_decisoes.md`
- Não tocar em `database/current-schema/**` nem em `apps/api/.env.local`

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

`drizzle.config.ts` sem credenciais, sem carregar `.env.local`, sem conectar ao banco durante `generate`. Migration gerada não pode conter `DROP`/`TRUNCATE`/`DELETE`/`UPDATE`, dados reais, credenciais, host ou nome do banco. Verificação de TLS fica pendente (P2), não resolvida aqui.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Corrigir dependência do script de inspeção; instalar `drizzle-orm`/`mysql2`/`drizzle-kit` em `apps/api`.
2. Criar ADR-001 e atualizar `decisoes_tecnicas.md`, `contrato_banco_dados.md`, `registro_decisoes.md` com a decisão Drizzle+mysql2 e a ressalva de TLS.
3. Modelar as 6 tabelas, `relations.ts`, `types.ts`, `drizzle.config.ts`.
4. Gerar a migration inicial (`drizzle-kit generate`), revisar o SQL, documentar em `database/proposed-schema/`.
5. Criar tipos de domínio em `packages/domain/src/` e testes mínimos sem acesso ao banco.

## 11. Critérios de Aceite

- [ ] Seis tabelas modeladas, migration gerada e não aplicada
- [ ] Nenhum comando destrutivo na migration
- [ ] ADR e decisões de governança atualizados
- [ ] `database/current-schema/` inalterado

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_03_modelagem_inicial_do_dominio_financeiro --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(modelagem_inicial_do_dominio_financeiro): _..._
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
