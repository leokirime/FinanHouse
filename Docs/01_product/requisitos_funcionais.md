# Requisitos Funcionais

> Projeto: FinanHouse · Atualizado em: 2026-08-04

> Todo bloco de implementação deve referenciar um requisito listado aqui. Se uma tarefa não tem requisito correspondente, atualize esta lista antes de implementar — não implemente "por inferência".

## 1. Lista de Requisitos

Numere os requisitos para que possam ser referenciados por blocos e prompts (ex.: `RF-01`).

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF-01 | Registrar movimentações financeiras (receitas/despesas) com ciclo de vida previsto → pendente → realizado, ou cancelado; permitir exclusão real e permanente de uma movimentação `planned`/`pending` | Must | Regras de domínio (Bloco 05); exclusão real substituindo o cancelamento como ação oferecida na interface, com confirmação obrigatória (Bloco 20) |
| RF-02 | Organizar movimentações por competência mensal, com abertura/revisão/fechamento | Must | Concluído (regras de domínio, Bloco 05) |
| RF-03 | Calcular indicadores financeiros por competência (previsto, realizado, pendente, saldo) | Must | Concluído (regras de domínio, Bloco 05) |
| RF-04 | Comparar duas competências mensais (variações de receita/despesa/saldo, categorias) | Should | Concluído (regras de domínio no Bloco 05; interface em memória no Bloco 08) |
| RF-05 | Persistir movimentações e competências em banco real (MySQL) | Must | Persistência local real funcionando: TLS validado em 2026-07-30, migration inicial aplicada em 2026-07-31 (Bloco 12, DT-08), integridade composta do membro responsável corrigida em 2026-07-31 (Bloco 13, DT-09), repositórios Drizzle reais em 2026-07-31 (Bloco 14, DT-10), API HTTP financeira v1 em 2026-08-01 (Bloco 16, DT-11), e **integração do frontend com a API real concluída em 2026-08-01** (Bloco 17, DT-12) — Dashboard, Movimentações, Comparativo, Histórico e Planejamento consomem exclusivamente a API, sem fallback demonstrativo. Autenticação real concluída no Bloco 19 (ver RF-09). **Ainda não concluído**: a API só pode ser executada localmente, nunca exposta publicamente; produção (`finanhouse_prod`) não preparada |
| RF-06 | Interface visual para consultar/editar movimentações e competências | Must | Dashboard, Movimentações, Comparativo, Histórico e Planejamento com dados reais via API (Bloco 17); refinamento visual pendente segue como P3. Limite por categoria (orçamento) em Planejamento implementado ponta a ponta no Bloco 18 (`usePeriodBudgets`, `BudgetFormDialog`, `CategoryBudgetList`) — ver RF-07 para o status da persistência real |
| RF-07 | Planejar limites de orçamento por categoria de despesa e acompanhar consumo (realizado, pendente, planejado, projetado) por competência | Should | Implementado em memória no Bloco 09 (`e107716`), regrediu para pendente no Bloco 17 (corte para a API real removeu o estado em memória sem repor tabela/endpoint). **Concluído com persistência real no Bloco 18** (DT-13): tabela `category_budgets`, repositório Drizzle, serviços de aplicação, endpoints `.../periods/:referenceMonth/budgets`, hook dedicado `usePeriodBudgets` e UI real na Planejamento. Migration `0002_category_budgets.sql` aplicada a `finanhouse_dev` em 2026-08-04 com autorização explícita do proprietário, auditada e validada por smoke-test transacional |
| RF-08 | Consultar histórico de competências e movimentações anteriores, somente leitura, com filtros por ano/status | Should | Concluído em memória (Bloco 10, integrado à `main` em `fd026da`) |
| RF-09 | Autenticar os usuários já vinculados ao household (login por e-mail/senha, sessão real, logout) e proteger todas as rotas financeiras — sem cadastro público | Must | **Implementado no Bloco 19** (DT-14): tabela `auth_sessions` + `users.password_hash`, hash Argon2id, sessão por cookie `HttpOnly`, endpoints `.../auth/{login,session,logout}`, todas as rotas financeiras exigem sessão válida (401) e household correspondente (404 se divergente), `createdByUserId`/`closedByUserId` derivados da sessão (nunca do corpo), `AuthProvider`/`LoginPage`/`AppRoot` reais no frontend, `VITE_FINANHOUSE_HOUSEHOLD_ID` removida (household vem da sessão). Migration `0003_auth_sessions.sql` gerada e revisada; aplicação e configuração das senhas iniciais dependem de duas autorizações separadas do checkpoint do Bloco 19 |

Detalhamento técnico completo das regras (transições de status, cálculos, estratégia monetária): `Docs/02_architecture/regras_dominio_financeiro.md`.

## 2. Critérios de Aceite

Para cada requisito, descreva como verificar que ele foi atendido (comportamento observável, não implementação).

### RF-01 — Movimentações financeiras
- [x] Uma movimentação pode ser criada, marcada como pendente, realizada ou cancelada, seguindo as transições documentadas.
- [x] Uma movimentação `realized` sempre tem valor e data de realização; nenhuma outra tem.
- [x] Um usuário consegue realizar essas ações pela interface visual — página "Movimentações" (Bloco 07), sobre estado em memória (`Docs/02_architecture/estado_temporario_frontend.md`); persistência real ainda depende de RF-05.
- [x] **Desde o Bloco 20**: a ação "Cancelar lançamento" deixou de ser oferecida na interface para iniciar um novo cancelamento — no lugar, uma movimentação de uma competência aberta pode ser **excluída permanentemente** ("Excluir lançamento"), mediante confirmação explícita em diálogo (nunca `window.confirm`, nunca exclusão direta no clique). Diferente do cancelamento, a exclusão alcança `planned`, `pending` **e também `realized`** — um lançamento marcado como realizado por engano continua podendo ser corrigido pela exclusão, sem exigir estorno prévio; só `cancelled` fica fora do conjunto elegível (reativação é o único caminho de volta). A exclusão remove o registro do banco (`DELETE`, nunca soft delete) e atualiza Dashboard/Comparativo/Planejamento/Histórico sem recarregar a página.
- [x] O status histórico `cancelled`, a transição `cancelFinancialEntry` e a ação "Reativar" (`cancelled → planned`) continuam funcionais para movimentações já canceladas antes do Bloco 20 — apenas o caminho de UI que **inicia** um novo cancelamento foi removido; nenhuma migration/remoção de enum foi feita.

### RF-02 — Competência mensal
- [x] Uma competência pode ser aberta, colocada em revisão, fechada e reaberta, seguindo as transições documentadas.
- [x] Uma competência fechada não aceita novas movimentações nem alterações comuns.
- [ ] Um usuário consegue gerenciar (abrir/revisar/fechar) competências pela interface visual — ainda não implementado; Bloco 07 cobriu apenas as movimentações dentro da competência atual, já aberta.

### RF-04 — Comparação entre competências
- [x] Um usuário consegue acessar `/comparativo` pela sidebar sem recarregar a página.
- [x] Um usuário consegue escolher duas competências diferentes, ordenadas da mais recente para a mais antiga, com rótulos mês/ano em pt-BR.
- [x] A interface apresenta receitas/despesas/saldo realizados, fechamento projetado, receitas/despesas previstas, variação absoluta e percentual, tratando base zero como "Sem base comparável".
- [x] A interface compara despesas por categoria, destaca maiores aumentos/reduções e lista despesas novas/encerradas pela chave tipo + categoria + descrição normalizada.
- [x] O comparativo usa a mesma fonte em memória do dashboard e de Movimentações; recarregar/remontar o provider retorna às fixtures sintéticas.

### RF-07 — Planejamento mensal (limites por categoria)
- [x] Um usuário consegue acessar `/planejamento` pela sidebar sem recarregar a página, escolhendo a competência a visualizar.
- [x] Um usuário consegue definir, editar e remover um limite mensal para uma categoria de despesa ativa, persistido via API real (`.../periods/:referenceMonth/budgets`, Bloco 18/DT-13) — nunca em memória.
- [x] A interface mostra, por categoria: limite (quando existir), realizado, pendente, planejado, projetado, saldo restante, valor excedido e percentual consumido — nunca inventando um limite zero para categoria sem planejamento.
- [x] Cada categoria recebe um status textual explícito (saudável/em atenção/excedido/sem planejamento) — nunca comunicado só por cor.
- [x] `cancelled` nunca compõe nenhum total; `planned`/`pending` compõem a projeção; `realized` usa o valor efetivamente realizado.
- [x] O Planejamento consome movimentações da mesma fonte real do dashboard/Movimentações/Comparativo (`FinanceProvider`); os limites por categoria usam um hook dedicado (`usePeriodBudgets`, fora de `FinanceProvider`, só consumido pela Planejamento) que também fala com a API real, nunca com um estado local.
- [x] Migration `0002_category_budgets.sql` aplicada em `finanhouse_dev` em 2026-08-04, com autorização explícita do proprietário (`AUTORIZO MIGRATION CATEGORY_BUDGETS FINANHOUSE_DEV`); auditoria pós-migration e smoke-test transacional aprovados.

### RF-08 — Histórico mensal (somente leitura)
- [x] Um usuário consegue acessar `/historico` pela sidebar sem recarregar a página.
- [x] A lista de competências aparece da mais recente para a mais antiga, com filtro por ano e por status da competência (`open`/`review`/`closed`).
- [x] Ao selecionar uma competência, a interface mostra receitas/despesas/saldo realizados, fechamento projetado e a contagem de movimentações por status (`planned`/`pending`/`realized`/`cancelled`).
- [x] As movimentações da competência selecionada podem ser filtradas por status, ordenadas da data mais recente para a mais antiga.
- [x] Nenhuma ação de criar, editar, realizar, cancelar ou excluir é oferecida no Histórico — estritamente consultivo.
- [x] O histórico usa a mesma fonte em memória do dashboard, de Movimentações, do Comparativo e do Planejamento; alterações em Movimentações refletem no Histórico na mesma sessão; alterações em Planejamento não afetam os valores históricos de movimentações.

### RF-09 — Autenticação real e sessão doméstica
- [x] Um usuário sem sessão válida vê a tela de login, nunca o dashboard nem qualquer dado financeiro.
- [x] Login com e-mail e senha corretos de um usuário já vinculado ao household autentica e libera o sistema; credenciais inválidas mostram uma mensagem sempre genérica (nunca revela se o e-mail existe).
- [x] Não existe nenhuma forma de criar um usuário novo pela interface ou pela API — só os usuários já existentes podem autenticar.
- [x] A sessão é mantida por cookie `HttpOnly`, nunca por `localStorage`/`sessionStorage`; o token bruto nunca aparece em nenhuma resposta JSON.
- [x] Toda rota financeira (`categories`, `members`, `periods`, `entries`, `budgets`) exige sessão válida — sem sessão, 401; com sessão de outro household, 404 (nunca distinguível de um household inexistente).
- [x] `createdByUserId`/`closedByUserId` são sempre derivados da sessão autenticada — o corpo da requisição nunca pode indicar outro usuário.
- [x] Logout revoga a sessão no servidor e limpa o estado local — recarregar a página depois do logout continua exigindo login.
- [ ] Migration `0003_auth_sessions.sql` aplicada em `finanhouse_dev` e senhas iniciais configuradas — pendentes de duas autorizações separadas (checkpoint do Bloco 19); até lá, o login não funciona em runtime real.

## 3. Perguntas Orientadoras

- Este requisito está descrito em termos de comportamento (o que o sistema faz), não de implementação (como ele faz)?
- Existe um critério de aceite que um avaliador externo conseguiria checar sem ler o código?
- Este requisito depende de algum outro ainda não atendido?

## 4. Riscos

Requisitos ambíguos, conflitantes ou que dependem de decisões de produto ainda não tomadas.

_..._

## 5. Decisões Pendentes

_..._
