# Bloco 05 — Regras de domínio e serviços financeiros

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Implementar e testar as principais regras financeiras do Finanhouse (movimentações, competências, cálculos, comparação mensal) sem utilizar banco de dados, migrations, Drizzle em runtime ou infraestrutura externa.

## 2. Contexto

O Bloco 04 diagnosticou TLS e bloqueou a aplicação da migration até resposta oficial da Clever Cloud. Em vez de esperar parado, este bloco avança a camada de domínio — que não depende do banco — usando repositórios em memória. Isso adianta desenvolvimento e testes da lógica central sem violar nenhum dos bloqueios ativos (migration, TLS, persistência real).

## 3. Problema que Este Bloco Resolve

Sem regras de domínio implementadas e testadas, nenhuma feature real pode ser construída, mesmo depois que o banco estiver liberado. Este bloco resolve isso adiantando a lógica de negócio de forma desacoplada da persistência, para que a troca de repositório em memória por um repositório real (Drizzle) seja uma substituição de adaptador, não uma reescrita.

## 4. Escopo

- Tipos de domínio reestruturados em `packages/domain/src/` (category, household-member, financial-entry, monthly-period)
- Módulo de dinheiro (`money`) com valores em centavos (`bigint`), conversão string↔centavos, aritmética e validação
- Regras de movimentação: criação, atualização, transições de status (planned/pending/realized/cancelled), validações de valores/datas/categoria/membro/competência
- Regras de competência mensal: abertura, revisão, fechamento, reabertura
- Cálculos financeiros mensais (previsto, realizado, pendente, saldo previsto/realizado/projetado)
- Comparação entre dois meses
- Interfaces de repositórios (ports) e implementações em memória
- Serviços de aplicação orquestrando regras + repositórios
- Testes automatizados extensivos
- Documentação das regras de domínio

## 5. Fora de Escopo

- MySQL, Clever Cloud, Drizzle em runtime, migrations, seeds
- Autenticação, usuários reais, endpoints HTTP públicos
- Deploy, Vercel, conexão TLS definitiva
- Acesso a `apps/api/.env.local`
- Qualquer alteração na migration existente ou no schema Drizzle (`apps/api/src/db/schema/`)
- Interface visual (fica para bloco futuro, com dados simulados)

## 6. Arquivos e Pastas Envolvidos

- `packages/domain/src/{money,category,household-member,financial-entry,monthly-period,summaries,errors}/**`
- `apps/api/src/application/{ports,services}/**`
- `apps/api/src/infrastructure/repositories/memory/**`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_05*`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`, branch do Bloco 04

## 7. Dependências

- Bloco 03 (tipos de domínio base já existentes em `packages/domain/src/`)
- Nenhuma dependência do Bloco 04 (TLS) — trabalho totalmente independente do banco

## 8. Plano de Implementação

_Passos em ordem de execução, não uma descrição genérica. Se um agente seguir só esta lista, ele deve chegar ao resultado esperado._

1. Implementar `money` (centavos como `bigint`, parse/format, aritmética, validação) com testes.
2. Reestruturar `packages/domain/src/` em subpastas (`category/`, `household-member/`, `financial-entry/`, `monthly-period/`, `summaries/`, `errors/`), preservando os tipos já existentes do Bloco 03.
3. Implementar `errors/domain-errors.ts` (erros de domínio tipados).
4. Implementar `financial-entry-rules.ts` (criação, atualização, transições nomeadas, validações) com testes.
5. Implementar `monthly-period-rules.ts` (abertura, revisão, fechamento, reabertura) com testes.
6. Implementar `summaries/monthly-summary.ts` (cálculos financeiros) com testes.
7. Implementar `summaries/compare-periods.ts` (comparação mensal) com testes.
8. Criar interfaces de repositórios em `apps/api/src/application/ports/`.
9. Criar implementações em memória em `apps/api/src/infrastructure/repositories/memory/`.
10. Criar serviços de aplicação em `apps/api/src/application/services/` com testes.
11. Documentar as regras de domínio.
12. Gerar e preencher o feedback oficial do bloco.

## 9. Critérios de Aceite

- [ ] Todas as transições de status permitidas e proibidas testadas
- [ ] Dinheiro representado em centavos (`bigint`), nunca `number`/`float`, em cálculos
- [ ] Nenhum arquivo novo importa `mysql2`, `drizzle-orm`, `.env*` ou scripts de migration
- [ ] Repositórios em memória são determinísticos e resetáveis entre testes
- [ ] Cálculos de resumo mensal e comparação entre meses cobertos por testes, incluindo divisão por zero
- [ ] `database/migrations/`, `apps/api/src/db/**` e a branch do Bloco 04 permanecem intocados

## 10. Validações Obrigatórias

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] Busca estática confirmando ausência de `mysql2`/`drizzle-orm`/`.env` nos novos arquivos

## 11. Segurança

Nenhum dado real é usado nos testes (dados fictícios). Nenhum arquivo deste bloco acessa `apps/api/.env.local` ou credenciais. Repositórios em memória não persistem nada em disco.

## 12. Performance

Não aplicável — lógica pura em memória, sem I/O.

## 13. Design System / UX

Não aplicável — este bloco não toca em `apps/web`.

## 14. Riscos

- Definições de cálculo (previsto/realizado/projetado) e de transições de status são decisões de produto tanto quanto técnicas — documentadas explicitamente para revisão, já que pequenas divergências de interpretação mudam o resultado dos relatórios financeiros.
- Repositórios em memória podem esconder problemas de performance/concorrência que só apareceriam com um banco real — aceitável nesta fase, documentado como limitação conhecida.

## 15. Pendências Esperadas

- P3 — Quando a persistência real (Drizzle) for liberada, será necessário implementar `Drizzle*Repository` para cada porta, mapeando tipos do schema (`apps/api/src/db/schema/`) para os tipos de domínio.
- P3 — Regras de fechamento de competência podem precisar de refinamento quando a interface visual e casos de uso reais forem definidos.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_05_regras_de_dominio_e_servicos_financeiros --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(regras_de_dominio_e_servicos_financeiros): _..._
```
