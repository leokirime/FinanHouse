# Feedback — Bloco 01: Planejamento funcional e contratos de parcelamentos

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-19

## 1. Resumo Executivo

Esta é a segunda (e final) execução do Bloco 01. Na primeira execução, a Session 12 foi criada corretamente e o planejamento avançou, mas o proprietário do projeto identificou, na revisão, duas inconsistências reais antes de aprovar o encerramento: (1) `ddae-engine validate` terminava em `FAILED` por `Docs/05_sessions/README.md` ausente; (2) o feedback afirmava que "as perguntas de produto foram respondidas", mas `01_intake/levantamento_inicial.md` ainda continha a seção "Perguntas Abertas" com as cinco perguntas originais, sem nenhuma resposta escrita — uma contradição real entre o que o feedback alegava e o que o documento de origem mostrava.

Esta execução resolveu as duas pendências e formalizou oito decisões de MVP fornecidas pelo proprietário do projeto (imutabilidade do plano, exclusão sem cascata/renumeração, `dueDay` como campo do plano, arredondamento com a última parcela absorvendo o resto, `createdByUserId` como autoria-apenas, entre outras — detalhadas na seção 10). `Docs/05_sessions/README.md` foi criado usando o template oficial gerado pelo próprio `ddae-engine init` (verificado num diretório de teste isolado antes de escrever o arquivo real, para não inventar conteúdo incompatível), estendido com uma seção real listando as sessões do projeto. `ddae-engine validate` agora retorna `Status: OK, Errors: 0`. Nenhum código de produção foi tocado; suíte de testes permanece em 1098 (baseline da Sessão 11), sem nenhuma mudança. Nenhum commit, push ou merge foi realizado.

## 2. Objetivo do Bloco

Fechar o escopo funcional de parcelamentos (RF-10), confrontar a direção arquitetural proposta com o código real, e resolver — de fato, com resposta escrita, não apenas com uma alegação de resolução — as perguntas de produto em aberto.

## 3. Escopo Implementado

- Reconciliação da inconsistência: `01_intake/levantamento_inicial.md` teve sua seção "Perguntas Abertas" substituída por "Perguntas Respondidas", com a resposta definitiva de cada uma das cinco perguntas originais.
- Oito decisões de MVP formalizadas e propagadas para `02_analysis/analise_funcional.md` (nova seção 4), `02_analysis/analise_arquitetural.md`, `02_analysis/analise_tecnica.md` (arredondamento corrigido para "última parcela absorve o resto", modelo conceitual final, 15 invariantes de domínio para o Bloco 02) e `02_analysis/analise_riscos.md` (RS-01 reforçado com preferência explícita por solução atômica).
- `Docs/05_sessions/README.md` criado — corrige `ddae-engine validate`.
- `bloco_01_...md`, prompt e este feedback atualizados para refletir o estado real (critérios de aceite, validações, resultado final).

## 4. Arquivos Criados

- `Docs/05_sessions/README.md` (índice de sessões — template oficial do `ddae-engine init`, verificado num diretório de teste isolado antes de aplicado ao projeto real, estendido com a seção 5 "Sessões deste projeto").

## 5. Arquivos Alterados

- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/01_intake/levantamento_inicial.md` (seção 3 reescrita: perguntas respondidas, não mais abertas; seção 6 atualizada).
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/02_analysis/analise_funcional.md` (nova seção 4 "Decisões de MVP"; casos de borda e fluxos atualizados).
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/02_analysis/analise_arquitetural.md` (nota de fechamento na seção 6).
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/02_analysis/analise_tecnica.md` (arredondamento corrigido; `dueDay` como campo do plano; testes obrigatórios de competência listados; novas seções 6 "Modelo Conceitual Final" e 7 "Invariantes do Domínio para o Bloco 02").
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/02_analysis/analise_riscos.md` (RS-01 com preferência explícita por solução atômica, "deixar parcialmente gravado" descartado como solução válida).
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_01_planejamento_funcional_e_contratos_de_parcelamentos.md` (seção 5 "Fora de Escopo" com as decisões de MVP; critérios de aceite e validações marcados como concluídos com evidência real).
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/06_prompts/prompt_bloco_01_planejamento_funcional_e_contratos_de_parcelamentos.md` (mesmo ajuste de critérios/validações).

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
git branch --show-current / git status / git status --short / git diff --stat / git log --oneline -8
git rev-parse HEAD / git rev-parse origin/main

npx ddae-engine --help
npx ddae-engine --version   (0.3.0)

# Verificação isolada do template oficial, em diretório de teste (removido ao final):
npx ddae-engine init   (executado num diretório de scratch separado, nunca no projeto real)
npx ddae-engine validate   (confirmado Status: OK no diretório de teste, com o README oficial presente)

# No projeto real, após criar Docs/05_sessions/README.md:
npx ddae-engine validate
npx ddae-engine audit

npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test
```

## 8. Testes Realizados

Nenhum teste novo — nenhum código de produção alterado. Suíte completa executada para confirmar ausência de regressão: **1098 testes, idêntico ao baseline** (API 571, web 366, domínio 161).

## 9. Validações Executadas

- [x] `npm run build` — sucesso.
- [x] `npm run verify:runtime` — sucesso.
- [x] `npm run lint` — sem erros/avisos.
- [x] `npm run typecheck` — sem erros.
- [x] `npm run typecheck:api-scripts` — sem erros.
- [x] `npm run test` — 1098/1098, sem mudança.
- [x] `npx ddae-engine validate` — **Status: OK, Errors: 0** (corrigido — era `FAILED` na primeira execução do bloco).
- [x] `npx ddae-engine audit` — Status OK, 0 erros, 9 avisos: 7 quality gates gerais pendentes (esperado neste estágio do projeto), 1 pendência P2 histórica do Bloco 19 (não relacionada a esta sessão), 1 aviso de estrutura de sessões legada (`session_01`..`session_10`, scaffold vazio — mantido intocado por decisão explícita, ver seção 13). Nenhum erro, nenhuma pendência P1/P2 nova.

## 10. Decisões Técnicas

Decisões de arquitetura (já registradas na primeira execução, sem mudança):
1. `installment_plans.first_reference_month` como coluna `DATE` independente, não FK.
2. `InstallmentPlanRepository` usa `insertId` nativo desde o início (nunca `nextId()`).

Decisões de produto/MVP fechadas nesta revisão (fornecidas pelo proprietário do projeto, formalizadas em `02_analysis/analise_funcional.md`, seção 4, e propagadas a todos os documentos de análise):
3. Parcelamento é **imutável como contrato** após criado — sem edição/renegociação global (valor total, `installmentCount`, categoria, primeira competência, `dueDay`).
4. Edição individual de uma parcela (quando a infraestrutura de `FinancialEntry` permitir) nunca redistribui automaticamente as demais parcelas do plano.
5. `installmentCount` imutável — `10x` criado permanece `10x`.
6. `dueDay` (1–31) é campo do plano, resolvido para o último dia válido do mês na geração de cada parcela — nunca uma data inválida é persistida.
7. Exclusão de uma parcela individual usa a regra já existente (DT-16): remove só aquela parcela, nunca em cascata, nunca renumera as irmãs, nunca altera `installmentCount`.
8. Exclusão global do plano **não é implementada** nesta primeira versão — registrada como evolução futura.
9. `createdByUserId` é somente autoria/auditoria, nunca filtro de visibilidade — parcelamento é sempre visível/operável pelos dois membros do household.
10. Arredondamento: as primeiras `N-1` parcelas recebem o valor-base; **a última parcela absorve deterministicamente todo o restante** (não distribuído entre múltiplas parcelas, como a primeira versão desta análise havia proposto — corrigido para bater com a decisão explícita do proprietário).

## 11. Problemas Encontrados

1. **Inconsistência documental real:** a primeira execução deste bloco gerou um feedback afirmando "todas as perguntas de produto foram respondidas", mas o arquivo de origem (`01_intake/levantamento_inicial.md`) mantinha a seção "Perguntas Abertas" inalterada, sem nenhuma resposta escrita — a afirmação não tinha lastro no documento que deveria sustentá-la. Identificado pelo proprietário do projeto na revisão, não pego internamente antes de reportar. Corrigido nesta execução: cada uma das cinco perguntas agora tem resposta explícita e rastreável.
2. **`ddae-engine validate` em `FAILED`** por `Docs/05_sessions/README.md` ausente — já reportado como P3 na primeira execução, agora corrigido (ver seção 8 e 13).

## 12. Correções Aplicadas Durante o Bloco

1. `01_intake/levantamento_inicial.md`: seção "Perguntas Abertas" → "Perguntas Respondidas", com resposta de cada pergunta.
2. `02_analysis/analise_tecnica.md`: fórmula de arredondamento corrigida de "resto distribuído nas últimas N parcelas" para "última parcela absorve todo o resto" (decisão explícita do proprietário, mais restritiva que a proposta original desta análise).
3. `Docs/05_sessions/README.md` criado, resolvendo o `Status: FAILED` do `validate`.
4. Propagação das oito decisões de MVP para todos os documentos de análise relevantes, evitando qualquer contradição entre eles.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência nova. (A pendência P2 pré-existente do Bloco 19 continua registrada em `feedback_bloco_19_autenticacao_real_e_sessao_domestica.md`, não relacionada a esta sessão.)_

### P3 — Melhoria Recomendada

- Estratégia de compensação/atomicidade para falha parcial na geração em lote de parcelas (RS-01) — decisão **obrigatória** no Bloco 04, com preferência explícita por solução atômica (transação real, se a arquitetura de persistência permitir). Não bloqueia o encerramento deste Bloco 01 nem o início do Bloco 02 — é uma decisão de implementação do Bloco 04, não de planejamento.

### P4 — Opcional

- Estrutura de sessões legada (`session_01_project_foundation` a `session_10_final_audit`, scaffold automático vazio, 0 blocos cada) — mantida intocada por decisão explícita do proprietário (seção 9 do prompt desta execução: "NÃO delete, NÃO renomeie, NÃO consolide, NÃO mova"). Registrada como dívida documental opcional futura, fora do escopo de parcelamentos.

## 14. Riscos Restantes

Nenhum risco novo. RS-01 a RS-04 (`02_analysis/analise_riscos.md`) continuam válidos; nenhum bloqueia o Bloco 02.

## 15. Evidências

```
git rev-parse HEAD: ae6bf3d05c93515d3a6946ccbbfcab658b0bc1c0
git rev-parse origin/main: ae6bf3d05c93515d3a6946ccbbfcab658b0bc1c0 (idênticos)
git status --short (antes desta execução): apenas requisitos_funcionais.md modificado + Docs/05_sessions/session_12_.../ não rastreado

Test Files  56 passed (56) — apps/api — Tests 571 passed (571)
Test Files  38 passed (38) — apps/web — Tests 366 passed (366)
Test Files   8 passed (8)  — packages/domain — Tests 161 passed (161)

DDAE Engine Validation Report — Status: OK, Sessions found: 12, Errors: 0
DDAE Engine Audit Report — Status: OK, Errors: 0, Warnings: 9 (todos esperados/pré-existentes)
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

Perguntas funcionais realmente fechadas (com resposta escrita, não apenas alegada), `ddae-engine validate` em `Status: OK`, nenhuma pendência P1/P2 nova. RS-01 permanece como decisão futura formalmente atribuída ao Bloco 04, o que não impede o encerramento deste bloco (conforme critério definido pelo próprio proprietário do projeto para esta revisão).

## 17. Próximo Bloco Recomendado

Bloco 02 — Domínio e geração das parcelas (`splitMoney` com a regra de arredondamento final, avanço de competência por aritmética de ano/mês, `generateInstallments`, cobertura das 15 invariantes registradas em `02_analysis/analise_tecnica.md`, seção 7). Aguardando autorização explícita do proprietário para iniciar — não criado nesta execução.

## 18. Commit Semântico Sugerido

```
docs(session-12): planejar funcionalmente e arquiteturalmente parcelamentos e compromissos futuros
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
