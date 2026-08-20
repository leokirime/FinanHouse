# Plano de Execução

> Projeto: FinanHouse · Atualizado em: 2026-08-19

> Este plano traduz a análise (`02_analysis/`) em uma sequência concreta de blocos. Cada etapa aqui deve corresponder a um bloco real em `05_blocks/`, não a uma intenção vaga.

## 1. Etapas

| Ordem | Bloco planejado | Objetivo resumido | Depende de |
|---|---|---|---|
| 1 | Bloco 01 — Planejamento funcional e contratos | Fechar escopo, confrontar arquitetura, registrar RF-10, resolver perguntas abertas de produto (este bloco) | — |
| 2 | Bloco 02 — Domínio e geração das parcelas | `splitMoney`, avanço de competência, `generateInstallments`, testes de invariante | Bloco 1 |
| 3 | Bloco 03 — Persistência, schema e migration | Tabela `installment_plans`, colunas novas em `financial_entries`, repositórios (Drizzle + memória), migration revisada (não aplicada sem autorização) | Bloco 2 |
| 4 | Bloco 04 — Serviços e API | `CreateInstallmentPlanService`, rota HTTP, decisão de compensação para falha parcial (RS-01) | Bloco 3 |
| 5 | Bloco 05 — Cadastro e visualização no frontend | Formulário de parcelamento, indicador "N/Total" em Movimentações | Bloco 4 |
| 6 | Bloco 06 — Dashboard, Planejamento, Comparativo e Histórico | Confirmar (via teste, não via código novo) que as telas já refletem parcelas corretamente; ajustar rotulagem onde fizer sentido | Bloco 5 |
| 7 | Bloco 07 — Smoke-test, validação manual e encerramento | Smoke-test transacional (rollback), validação manual real, documentação final, checkpoint para commit/merge | Bloco 6 |

Esta divisão em 7 blocos segue a estrutura originalmente sugerida pelo proprietário do projeto — confirmada como adequada após a análise desta sessão, sem necessidade de blocos adicionais.

## 2. Cronograma

Sem deadline absoluto — ordem de dependência é o critério real (ver seção 3). Cada bloco só começa depois do anterior estar concluído, testado e documentado, seguindo o mesmo ritmo já usado nos 20 blocos da Sessão 11.

## 3. Critério de Sequenciamento

Dependência técnica estrita: domínio (regra pura, sem I/O) antes de persistência (precisa da regra para saber o que gravar); persistência antes de serviços/API (precisa do repositório); API antes de frontend (a UI consome a rota); telas de cálculo (Dashboard/Comparativo/Planejamento/Histórico) por último, porque a expectativa (confirmada na análise arquitetural) é que já funcionem sem alteração, uma vez que cada parcela é uma `financial_entry` real — o Bloco 06 é principalmente validação, não construção nova.

## 4. Perguntas Orientadoras

- **Algum bloco está vago demais?** Bloco 04 depende de uma decisão ainda pendente (RS-01, compensação de falha parcial) — está sinalizado explicitamente como algo a decidir no início do próprio bloco, não a implementar às pressas no Bloco 01.
- **Existe um bloco crítico cuja remoção invalida o resto?** Bloco 02 (domínio) — sem `splitMoney`/avanço de competência corretos e testados, nenhum bloco seguinte pode confiar no resultado.

## 5. Decisões Pendentes

Nenhuma além das já registradas em `02_analysis/analise_riscos.md` (RS-01) e `01_intake/levantamento_inicial.md` (seção 3) — a resolver nos blocos indicados, não nesta etapa de planejamento.
