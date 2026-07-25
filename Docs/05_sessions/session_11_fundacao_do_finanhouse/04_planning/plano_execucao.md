# Plano de Execução

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Este plano traduz a análise (`02_analysis/`) em uma sequência concreta de blocos. Cada etapa aqui deve corresponder a um bloco real em `05_blocks/`, não a uma intenção vaga.

## 1. Etapas

| Ordem | Bloco planejado | Objetivo resumido | Depende de |
|---|---|---|---|
| 1 | Diagnóstico (Bloco 1) | Inspecionar ambiente e descobrir comandos oficiais do `ddae-engine` | — |
| 2 | Inicialização DDAE (Bloco 2) | Rodar `ddae-engine init` e criar esta sessão | Bloco 1 |
| 3 | Estrutura do monorepo (Bloco 3) | Criar `apps/`, `packages/`, `database/`, `assets/`, `scripts/`, `tests/` e arquivos-base | Bloco 2 |
| 4 | React + API Node.js (Bloco 4) | Bootstrap técnico de `apps/web` (Vite/TS) e `apps/api` (Node.js) | Bloco 3 |
| 5 | Banco, assets e documentação (Bloco 5) | Inspeção somente leitura do MySQL já existente na Clever Cloud, documentação do estado real (`database/current-schema`), assets finais, documentação de contratos | Bloco 4 |
| 6 | Validações (Bloco 6) | `ddae-engine validate`/`audit`, fechamento da sessão | Bloco 5 |

## 2. Cronograma

Sem deadline absoluto — projeto pessoal. Ordem e dependência entre blocos importam mais que datas.

## 3. Critério de Sequenciamento

Governança (DDAE) antes de estrutura, estrutura antes de código de aplicação, código antes de dados reais e validação. Isso evita misturar bootstrap técnico com decisões de escopo/documentação, e garante que cada bloco seja auditável isoladamente.

## 4. Perguntas Orientadoras

- Algum bloco deste plano está descrito de forma vaga demais para ser executado sem mais perguntas? Não no momento — cada bloco tem escopo e fora-de-escopo explícitos no README da sessão.
- Existe um bloco que, se removido, invalida o restante do plano? Sim, o Bloco 2 (inicialização DDAE) — sem ele não há governança nem sessão oficial para ancorar os blocos seguintes.

## 5. Decisões Pendentes

- Confirmar localização da logo oficial do Finanhouse antes do fechamento do Bloco 3.
- O MySQL na Clever Cloud **já está provisionado** (confirmado em 2026-07-25) — o que falta é a inspeção somente leitura do seu estado real, planejada para o Bloco 5.
- Biblioteca de acesso ao MySQL e estratégia de migrations: decisão adiada para depois do inventário do banco (Bloco 5).
