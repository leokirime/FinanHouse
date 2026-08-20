# Mapa de Dependências

> Projeto: FinanHouse · Atualizado em: 2026-08-19

## 1. Dependências Internas

| Bloco | Depende de | Motivo |
|---|---|---|
| Bloco 02 (domínio) | Bloco 01 | Precisa das decisões fechadas em `02_analysis/` (arredondamento, `first_reference_month` como data solta, etc.) antes de escrever código. |
| Bloco 03 (persistência) | Bloco 02 | Schema/repositório precisam do formato final de `InstallmentPlan`/parcela definido no domínio. |
| Bloco 04 (serviços/API) | Bloco 03 | Serviço orquestra repositórios que só existem a partir do Bloco 03. |
| Bloco 05 (frontend) | Bloco 04 | UI consome a rota HTTP criada no Bloco 04. |
| Bloco 06 (Dashboard/Planejamento/Comparativo/Histórico) | Bloco 05 | Precisa de parcelamentos reais já cadastráveis para validar as telas ponta a ponta. |
| Bloco 07 (encerramento) | Bloco 06 | Smoke-test e validação manual só fazem sentido com a funcionalidade completa. |

## 2. Dependências Externas

| Dependência | Tipo | Status | Bloqueia o quê |
|---|---|---|---|
| Sessão 11 (fundação do FinanHouse), Bloco 20 mergeado em `main` | Sessão | Pronta (`ae6bf3d`) | Nada — pré-requisito já satisfeito; esta sessão parte de uma base estável. |
| `contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md` | Contrato | Prontos, a estender (não a redesenhar) | Bloco 03/04 precisam atualizar esses contratos ao introduzir a tabela/rota nova — não bloqueiam o início, mas são parte da definição de pronto de cada bloco. |
| Autorização explícita do proprietário para aplicar a migration real em `finanhouse_dev` | Decisão | Pendente (a solicitar no Bloco 03, quando a migration estiver escrita e revisada) | Aplicação real da migration — não bloqueia a escrita/revisão da migration em si. |
| DT-15 (dívida técnica de geração de id em `financial_entries`/`monthly_periods`/`category_budgets`) | Decisão/dívida técnica pré-existente | Registrada, não resolvida nas três tabelas antigas | Não bloqueia esta sessão — apenas informa a decisão de não repetir o mesmo padrão na tabela nova (`installment_plans`), conforme `02_analysis/analise_arquitetural.md`. |

## 3. Perguntas Orientadoras

- **Existe dependência circular?** Não — a cadeia é estritamente linear (domínio → persistência → serviços/API → frontend → telas de cálculo → encerramento), sem nenhum bloco posterior sendo pré-requisito de um anterior.
- **Alguma dependência externa está fora do controle da equipe?** A autorização do proprietário para migration é a única dependência externa real (não é uma API de terceiro) — já registrada como bloqueio explícito, não como risco técnico.

## 4. Decisões Pendentes

Nenhuma além das já listadas na seção 2.
