# Bloco 01 — Planejamento funcional e contratos de parcelamentos

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-19

## 1. Objetivo

Fechar o escopo funcional de "Parcelamentos e Compromissos Futuros" (RF-10), confrontar a direção arquitetural proposta pelo proprietário do projeto com o código real do FinanHouse, e resolver as perguntas de produto em aberto — sem escrever nenhum código de implementação (isso começa no Bloco 02).

## 2. Contexto

Sessão 11 (fundação do FinanHouse) encerrou o Bloco 20 (exclusão real de lançamentos) com `main` limpa e sincronizada (`ae6bf3d`, 1098 testes). O proprietário definiu a próxima funcionalidade: permitir registrar uma compra parcelada uma única vez e ter cada parcela gerada como uma movimentação financeira real, na sua própria competência — em vez do único lançamento no valor total hoje possível, que distorceria o mês do cadastro.

`installment_plans` já era mencionado como extensão futura desde o Bloco 03 (`database/proposed-schema/extensoes-futuras.md`), nunca modelado em código. Esta Sessão 12 formaliza e implementa esse conceito.

## 3. Problema que Este Bloco Resolve

Sem este bloco, a implementação (Bloco 02 em diante) começaria sem: (a) um requisito formal registrado, (b) confronto entre a "direção" proposta e a arquitetura real (risco de reintroduzir o padrão de geração de id já identificado como vulnerável em DT-15, ou de modelar `first_reference_month` de um jeito que não se sustenta contra competências futuras ainda inexistentes), e (c) respostas às perguntas de produto que, se deixadas em aberto, forçariam decisões de última hora durante a codificação.

## 4. Escopo

- Registro formal de RF-10 em `Docs/01_product/requisitos_funcionais.md`.
- Levantamento inicial, análise funcional, arquitetural, técnica e de riscos (`01_intake/`, `02_analysis/`) da Sessão 12.
- Confronto da arquitetura proposta pelo usuário com o domínio/schema/repositórios reais existentes — decisões técnicas já resolvidas nesta etapa: `first_reference_month` como coluna de data solta (não FK para `monthly_periods`); `InstallmentPlanRepository` usa `insertId` nativo desde o início (nunca o padrão `nextId()` identificado como dívida em DT-15).
- Resolução das perguntas de produto em aberto (ver seção 8 abaixo).
- Plano de execução dos Blocos 02–07 desta sessão (`04_planning/plano_execucao.md`).
- Criação da branch dedicada `feat/session-12-bloco-01-parcelamentos-planejamento`.

## 5. Fora de Escopo

- Qualquer código de domínio, schema, migration, serviço, rota ou UI (começa no Bloco 02).
- Recorrências genéricas (`recurrence_rules`) — funcionalidade distinta, sem valor total/N ocorrências fixas.
- Edição/renegociação global de um parcelamento já criado (valor total, número de parcelas, categoria, primeira competência, `dueDay`) — **decisão de MVP: o plano é imutável como contrato após criado** (ver `01_intake/levantamento_inicial.md`, seção 3, e `02_analysis/analise_funcional.md`, seção 4). Só as operações já existentes por parcela individual continuam disponíveis (marcar pendente, realizar, cancelar, excluir).
- Exclusão global do parcelamento inteiro (todas as parcelas de uma vez) — **decisão de MVP: não implementada nesta primeira versão**; só exclusão individual de parcela, usando a regra já existente (DT-16), sem cascata.
- Aplicação de qualquer migration real em `finanhouse_dev` (só acontecerá no Bloco 03, com autorização explícita separada).
- Deploy/produção/Vercel — trilha independente, não relacionada a esta sessão.

## 6. Arquivos e Pastas Envolvidos

Somente documentação nesta etapa:
- `Docs/01_product/requisitos_funcionais.md` (RF-10)
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/**` (toda a estrutura desta sessão)
- `Docs/05_sessions/README.md` (criado nesta revisão — índice ausente que fazia `ddae-engine validate` falhar; usa o template oficial gerado por `ddae-engine init`, sem inventar conteúdo incompatível)

Nenhum arquivo de código (`packages/`, `apps/`) é tocado neste bloco.

## 7. Dependências

- Sessão 11 concluída e mergeada em `main` (`ae6bf3d05c93515d3a6946ccbbfcab658b0bc1c0`) — satisfeita.

## 8. Plano de Implementação

1. Levantar contexto e necessidades (`01_intake/levantamento_inicial.md`).
2. Analisar funcionalmente cada fluxo envolvido, ligado a RF-10 (`02_analysis/analise_funcional.md`).
3. Confrontar a arquitetura proposta com o código real — domínio (`FinancialEntry`, `Money`, `MonthlyPeriod`), schema (`financial-entries.ts`, `category-budgets.ts` como precedente), lição de DT-15/DT-16 (`02_analysis/analise_arquitetural.md`).
4. Detalhar a abordagem técnica de cada aspecto não trivial: divisão monetária sem perda de centavos, avanço de competência, vencimento em dia inválido, geração em lote (`02_analysis/analise_tecnica.md`).
5. Mapear riscos e decisões adiadas explicitamente para blocos futuros (`02_analysis/analise_riscos.md`).
6. Traduzir tudo em um plano de execução de 7 blocos (`04_planning/plano_execucao.md`) e mapa de dependências (`04_planning/mapa_dependencias.md`).
7. Registrar RF-10 formalmente.
8. Criar branch dedicada.
9. Validar (`ddae-engine validate`/`audit`, suíte de testes — sem alteração de código, deve continuar em 1098).
10. Gerar feedback do bloco e parar para revisão — nenhum commit automático.

## 9. Critérios de Aceite

- [x] RF-10 registrado em `Docs/01_product/requisitos_funcionais.md`, com critérios de aceite verificáveis (a refinar nos blocos seguintes conforme a implementação avança).
- [x] Todas as perguntas do levantamento inicial (seção 3 de `01_intake/levantamento_inicial.md`) têm **resposta definitiva registrada** — nenhuma decisão de produto adiada silenciosamente, nenhuma seção "Perguntas Abertas" remanescente (reconciliado nesta revisão; a primeira versão do bloco afirmava resolução sem o texto correspondente ter sido de fato escrito — corrigido).
- [x] `first_reference_month`, estratégia de geração de id do novo repositório, imutabilidade do plano, `dueDay` como campo do plano, ausência de exclusão em cascata e `createdByUserId` como autoria-apenas têm decisão explícita e justificada (`02_analysis/analise_arquitetural.md`, `02_analysis/analise_funcional.md` seção 4).
- [x] Invariantes de domínio para o Bloco 02 registradas explicitamente (`02_analysis/analise_tecnica.md`, seção 7).
- [x] Plano de execução cobre os 7 blocos com dependências e critério de sequenciamento explícitos.
- [x] Branch `feat/session-12-bloco-01-parcelamentos-planejamento` criada a partir de uma `main` confirmada limpa e sincronizada.
- [x] Nenhum código de produção alterado neste bloco.
- [x] `npx ddae-engine validate` retorna `Status: OK`, `Errors: 0` (corrigido nesta revisão — `Docs/05_sessions/README.md` estava ausente).
- [x] Feedback do bloco gerado e preenchido (`ddae-engine feedback create`).

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` — 1098 testes, idêntico ao baseline da Sessão 11 (nenhum código alterado)
- [x] `npx ddae-engine validate` — Status OK, 0 erros
- [x] `npx ddae-engine audit` — Status OK, 0 erros, 9 avisos (todos pré-existentes/esperados: quality gates gerais, P2 histórica do Bloco 19, estrutura legada `session_01..10`)

## 11. Segurança

Não aplicável neste bloco — nenhum código, nenhuma rota, nenhum dado tocado. A modelagem de segurança real (household sempre no filtro, `createdByUserId` da sessão, nunca soft delete) será herdada diretamente dos padrões já estabelecidos (DT-09, DT-14, DT-16) nos Blocos 03–04.

## 12. Performance

Não aplicável neste bloco — análise de impacto de performance já registrada em `02_analysis/analise_arquitetural.md`, seção 4 (impacto esperado: baixo).

## 13. Design System / UX

Não aplicável neste bloco — nenhuma tela é tocada. A intenção de reaproveitar `EntryDialog`/`useMutationDialog`/`FinancialEntryList` sem introduzir padrão visual novo está registrada em `02_analysis/analise_arquitetural.md` para os Blocos 05–06.

## 14. Riscos

Ver `02_analysis/analise_riscos.md` (RS-01 a RS-04) — nenhum risco bloqueia o início do Bloco 02.

## 15. Pendências Esperadas

- RS-01 (estratégia de compensação para falha parcial na geração em lote) — decisão adiada explicitamente para o Bloco 04, registrada como P3 em `02_analysis/analise_riscos.md`.

## 16. Feedback Obrigatório

Gerar e preencher via `ddae-engine feedback create --block bloco_01_planejamento_funcional_e_contratos_de_parcelamentos --session session_12_parcelamentos_e_compromissos_futuros` — sem feedback preenchido, o bloco não está concluído.

## 17. Commit Semântico Sugerido

_Sugestão apenas — nunca executado automaticamente sem confirmação explícita do usuário._

```
docs(session-12): planejar funcionalmente e arquiteturalmente parcelamentos e compromissos futuros
```
