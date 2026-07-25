# Prompt — Bloco 04: Validação TLS e revisão pré-migration

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_04_validacao_tls_e_revisao_pre_migration.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Confirmar que a conexão externa com o MySQL da Clever Cloud utiliza transporte seguro, realizar a revisão final da migration inicial e produzir evidências para uma futura decisão de aplicação, sem alterar o banco.

## 3. Escopo

Validar SSL/TLS local; testar conectividade segura (conexão única, somente leitura); identificar se a sessão usa criptografia; revisar a migration novamente; produzir (sem executar) plano de aplicação e rollback; documentar evidências sanitizadas.

## 4. Fora de Escopo

Aplicar migration; `drizzle-kit migrate`/`push`; executar SQL manualmente; inserir dados; seeds; usuários reais; autenticação; alterar configuração da Clever Cloud.

## 5. Arquivos Permitidos

- `database/inspection/test-tls.ts`
- `database/current-schema/tls-inspection.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_04*`
- Leitura apenas: `database/migrations/0000_initial_financial_domain.sql`, `apps/api/drizzle.config.ts`
- Não tocar em `apps/api/.env.local`, `apps/api/src/db/schema/**`, `database/current-schema/{inspection-summary,tables,indexes,relationships,inventory}.md` (já fecham o estado do Bloco 02)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Nunca exibir host/porta/usuário/senha/banco/URL de conexão, nem parcialmente. Apenas status "configurado"/"ausente". Conexão única, somente leitura, timeout curto, fechada em `finally`. Nenhuma consulta a tabelas de aplicação. Se TLS não estiver ativo: não desativar controles, não inserir dados, não aplicar migration — registrar P2 e parar.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Confirmar `apps/api/.env.local` ignorado pelo Git.
2. Escrever e executar `database/inspection/test-tls.ts` (conectividade + status de TLS, sanitizado).
3. Revisar a migration novamente contra a checklist de compatibilidade/segurança.
4. Documentar plano de aplicação e rollback (sem executar).
5. Gerar e preencher o feedback oficial.

## 11. Critérios de Aceite

- [ ] Nenhum valor de credencial exibido em nenhuma saída
- [ ] Resultado do TLS registrado com evidência sanitizada
- [ ] Migration revisada, nenhuma alteração feita sem justificativa registrada
- [ ] Plano de aplicação/rollback documentado, nada executado
- [ ] Banco não alterado (nenhuma tabela criada/dado inserido)

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npx drizzle-kit check`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_04_validacao_tls_e_revisao_pre_migration --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(validacao_tls_e_revisao_pre_migration): _..._
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
