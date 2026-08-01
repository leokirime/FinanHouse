# Requisitos Funcionais

> Projeto: FinanHouse · Atualizado em: 2026-08-01

> Todo bloco de implementação deve referenciar um requisito listado aqui. Se uma tarefa não tem requisito correspondente, atualize esta lista antes de implementar — não implemente "por inferência".

## 1. Lista de Requisitos

Numere os requisitos para que possam ser referenciados por blocos e prompts (ex.: `RF-01`).

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF-01 | Registrar movimentações financeiras (receitas/despesas) com ciclo de vida previsto → pendente → realizado, ou cancelado | Must | Concluído (regras de domínio, Bloco 05) |
| RF-02 | Organizar movimentações por competência mensal, com abertura/revisão/fechamento | Must | Concluído (regras de domínio, Bloco 05) |
| RF-03 | Calcular indicadores financeiros por competência (previsto, realizado, pendente, saldo) | Must | Concluído (regras de domínio, Bloco 05) |
| RF-04 | Comparar duas competências mensais (variações de receita/despesa/saldo, categorias) | Should | Concluído (regras de domínio no Bloco 05; interface em memória no Bloco 08) |
| RF-05 | Persistir movimentações e competências em banco real (MySQL) | Must | Persistência local real funcionando: TLS validado em 2026-07-30, migration inicial aplicada em 2026-07-31 (Bloco 12, DT-08), integridade composta do membro responsável corrigida em 2026-07-31 (Bloco 13, DT-09), repositórios Drizzle reais em 2026-07-31 (Bloco 14, DT-10), API HTTP financeira v1 em 2026-08-01 (Bloco 16, DT-11), e **integração do frontend com a API real concluída em 2026-08-01** (Bloco 17, DT-12) — Dashboard, Movimentações, Comparativo, Histórico e Planejamento consomem exclusivamente a API, sem fallback demonstrativo. **Ainda não concluído**: autenticação real; a API só pode ser executada localmente, nunca exposta publicamente; produção (`finanhouse_prod`) não preparada |
| RF-06 | Interface visual para consultar/editar movimentações e competências | Must | Dashboard, Movimentações, Comparativo, Histórico e Planejamento com dados reais via API (Bloco 17); refinamento visual pendente segue como P3. Limite por categoria (orçamento) em Planejamento permanece sem persistência própria — Planejamento usa movimentações reais (`planned`/`pending`) enquanto isso |
| RF-07 | Planejar limites de orçamento por categoria de despesa e acompanhar consumo (realizado, pendente, planejado, projetado) por competência | Should | Implementado em memória no Bloco 09 (`e107716`), mas **regrediu para pendente** no Bloco 17: o corte para a API real removeu o estado em memória e não existe tabela/endpoint de orçamento — Planejamento hoje mostra apenas movimentações reais (`planned`/`pending`), sem limite configurável. Persistência de limites por categoria é o próximo passo natural |
| RF-08 | Consultar histórico de competências e movimentações anteriores, somente leitura, com filtros por ano/status | Should | Concluído em memória (Bloco 10, integrado à `main` em `fd026da`) |

Detalhamento técnico completo das regras (transições de status, cálculos, estratégia monetária): `Docs/02_architecture/regras_dominio_financeiro.md`.

## 2. Critérios de Aceite

Para cada requisito, descreva como verificar que ele foi atendido (comportamento observável, não implementação).

### RF-01 — Movimentações financeiras
- [x] Uma movimentação pode ser criada, marcada como pendente, realizada ou cancelada, seguindo as transições documentadas.
- [x] Uma movimentação `realized` sempre tem valor e data de realização; nenhuma outra tem.
- [x] Um usuário consegue realizar essas ações pela interface visual — página "Movimentações" (Bloco 07), sobre estado em memória (`Docs/02_architecture/estado_temporario_frontend.md`); persistência real ainda depende de RF-05.

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
- [x] Um usuário consegue definir, editar e remover (temporariamente, só na sessão) um limite mensal para uma categoria de despesa ativa.
- [x] A interface mostra, por categoria: limite (quando existir), realizado, pendente, planejado, projetado, saldo restante, valor excedido e percentual consumido — nunca inventando um limite zero para categoria sem planejamento.
- [x] Cada categoria recebe um status textual explícito (saudável/em atenção/excedido/sem planejamento) — nunca comunicado só por cor.
- [x] `cancelled` nunca compõe nenhum total; `planned`/`pending` compõem a projeção; `realized` usa o valor efetivamente realizado.
- [x] O planejamento usa a mesma fonte em memória do dashboard, de Movimentações e do Comparativo; recarregar/remontar o provider retorna às fixtures sintéticas.

### RF-08 — Histórico mensal (somente leitura)
- [x] Um usuário consegue acessar `/historico` pela sidebar sem recarregar a página.
- [x] A lista de competências aparece da mais recente para a mais antiga, com filtro por ano e por status da competência (`open`/`review`/`closed`).
- [x] Ao selecionar uma competência, a interface mostra receitas/despesas/saldo realizados, fechamento projetado e a contagem de movimentações por status (`planned`/`pending`/`realized`/`cancelled`).
- [x] As movimentações da competência selecionada podem ser filtradas por status, ordenadas da data mais recente para a mais antiga.
- [x] Nenhuma ação de criar, editar, realizar, cancelar ou excluir é oferecida no Histórico — estritamente consultivo.
- [x] O histórico usa a mesma fonte em memória do dashboard, de Movimentações, do Comparativo e do Planejamento; alterações em Movimentações refletem no Histórico na mesma sessão; alterações em Planejamento não afetam os valores históricos de movimentações.

## 3. Perguntas Orientadoras

- Este requisito está descrito em termos de comportamento (o que o sistema faz), não de implementação (como ele faz)?
- Existe um critério de aceite que um avaliador externo conseguiria checar sem ler o código?
- Este requisito depende de algum outro ainda não atendido?

## 4. Riscos

Requisitos ambíguos, conflitantes ou que dependem de decisões de produto ainda não tomadas.

_..._

## 5. Decisões Pendentes

_..._
