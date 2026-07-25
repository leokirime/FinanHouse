# Prompt — Bloco 05: Regras de domínio e serviços financeiros

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_05_regras_de_dominio_e_servicos_financeiros.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Implementar e testar as principais regras financeiras do Finanhouse sem utilizar banco de dados, migrations, Drizzle em runtime ou infraestrutura externa.

## 3. Escopo

Tipos de domínio; regras de movimentação (transições, validações); regras de competência mensal; cálculos financeiros; comparação mensal; interfaces de repositórios; implementações em memória; serviços de aplicação; testes; documentação.

## 4. Fora de Escopo

MySQL; Clever Cloud; Drizzle em runtime; migrations; seeds; autenticação; usuários reais; endpoints públicos; deploy; Vercel; conexão TLS; acesso a `.env.local`; alteração da migration existente.

## 5. Arquivos Permitidos

- `packages/domain/src/**`
- `apps/api/src/application/**`, `apps/api/src/infrastructure/repositories/memory/**`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_05*`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`, ou qualquer arquivo da branch `feat/session-11-bloco-04-validacao-tls`

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Dados fictícios apenas nos testes. Nenhum acesso a `.env.local` ou credenciais.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Implementar `money`, tipos de domínio reestruturados, `domain-errors`.
2. Implementar regras de movimentação e de competência mensal, com testes.
3. Implementar cálculos de resumo mensal e comparação entre meses, com testes.
4. Implementar portas (interfaces) e repositórios em memória.
5. Implementar serviços de aplicação, com testes.
6. Documentar as regras e gerar o feedback oficial.

## 11. Critérios de Aceite

- [ ] Todas as transições permitidas/proibidas testadas
- [ ] Dinheiro em centavos (`bigint`) em toda a camada de domínio
- [ ] Nenhum import de `mysql2`/`drizzle-orm`/`.env` nos novos arquivos
- [ ] `apps/api/src/db/**`, `database/migrations/**` e a branch do Bloco 04 intocados

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
ddae-engine feedback create --block bloco_05_regras_de_dominio_e_servicos_financeiros --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(regras_de_dominio_e_servicos_financeiros): _..._
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
