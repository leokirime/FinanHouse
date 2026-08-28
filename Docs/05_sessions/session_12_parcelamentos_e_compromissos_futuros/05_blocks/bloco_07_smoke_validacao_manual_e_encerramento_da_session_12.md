# Bloco 07 — Smoke, validação manual e encerramento da Session 12

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-28

## 1. Objetivo

Confirmar por smoke local (testes/inspeção, sem Aiven) que os seis blocos anteriores da Session 12 continuam consistentes entre si e sem regressão, documentar o encerramento técnico e preparar — sem executar — o checkpoint de versionamento/encerramento formal.

## 2. Contexto

Último bloco planejado desde a abertura da sessão (`04_planning/plano_execucao.md`, etapa 7: "Smoke-test transacional, validação manual real, documentação final, checkpoint para commit/merge"). Os Blocos 01–06 já foram implementados, testados, aprovados visualmente e integrados na `main` (Bloco 06 em `906ae49f...`, mais o hotfix visual pós-integração em `c4396f660d0a4336fe7b05147c53bcfbd33556c2`). Este bloco não introduz funcionalidade nova — é o fechamento de ciclo.

## 3. Problema que Este Bloco Resolve

Ninguém revisou formalmente, de ponta a ponta e depois de todas as correções já aplicadas, se os contratos centrais estabelecidos nos Blocos 01–04 (domínio/persistência/API) continuam exatamente como documentado depois das telas derivadas e dos dois hotfixes do Bloco 06. Sem essa revisão consolidada, a Session 12 não tem uma declaração única e verificável de "pronta para encerrar".

## 4. Escopo

- Reconstrução do inventário dos 7 blocos a partir da documentação real (feedbacks, decisões técnicas, `plano_execucao.md`).
- Revisão dos 14 contratos centrais (seção 8 desta abertura) por leitura de código + testes já existentes.
- Smoke local (fixtures/mocks/in-memory, sem Aiven) cobrindo: geração/arredondamento de parcelas, persistência atômica (rollback), listagem/detalhe, rotulagem, Dashboard/Planejamento/Comparativo/Histórico, "Marcar como pago" (sem duplicação), hotfix visual, conclusão automática, avulso, erros sanitizados, dinheiro (bigint), household/autoria.
- Um teste novo, legítimo (não redundante): confirmação de que `GET .../installment-plans` também sanitiza um erro de conexão para 503 — mesmo padrão já provado para `entries`, mas nunca testado especificamente nesta rota.
- Inspeção documental da migration `0004_deep_machine_man.sql` (sem reaplicar).
- Atualização deste bloco/prompt com evidência de execução.
- Feedback do Bloco 07, criado e preenchido ao final.

## 5. Fora de Escopo

- Qualquer acesso real ao Aiven, migration, `db:migrate`/`db:push`, seed/bootstrap real, deploy.
- Qualquer funcionalidade nova (exclusão global de plano, encerramento antecipado, antecipação de parcelas) — todas continuam fora do MVP.
- `git add`/`commit`/`push`/`merge` e encerramento formal da Session 12 — dependem de aprovação humana explícita em rodada futura.
- Criação de Session 14.

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/http/routes/installment-plans.test.ts` (único arquivo de produção/teste tocado — o teste de sanitização de erro descrito na seção 4).
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_07_...md` e `06_prompts/prompt_bloco_07_...md` (este bloco).
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/08_feedbacks/feedback_bloco_07_...md` (só ao final).

## 7. Dependências

- Bloco 06 integrado na `main` (`906ae49f...`) + hotfix visual integrado (`c4396f660d0a4336fe7b05147c53bcfbd33556c2`).
- Toda a suíte de testes construída nos Blocos 01–06 (1344 testes na baseline desta abertura).

## 8. Plano de Implementação

1. Checkpoint de git (worktree isolado a partir de `origin/main`, preservação dos arquivos DDAE do próprio bloco).
2. Reconstrução do inventário dos 7 blocos via documentação real.
3. Revisão dos 14 contratos centrais por leitura de código + `grep` direcionado (evidência, não memória).
4. Confirmação de cobertura de smoke existente para cada cenário pedido (Dashboard/Planejamento/Comparativo/Histórico/Movimentações/atomicidade/conclusão/avulso/erros/dinheiro/household) — sem duplicar teste já existente.
5. Adição do único teste legitimamente novo identificado (503 sanitizado em `GET .../installment-plans`).
6. Execução completa das validações obrigatórias.
7. Auditoria de git/segurança.
8. Documentação deste bloco/prompt com evidência.
9. Criação e preenchimento do feedback.

## 9. Critérios de Aceite

- [x] Inventário dos 7 blocos reconstruído a partir de documentação real.
- [x] Os 14 contratos centrais confirmados por código/teste, não por suposição.
- [x] Smoke local cobrindo todos os cenários pedidos, sem acesso ao Aiven.
- [x] Nenhuma regressão em nenhuma suíte.
- [x] Nenhuma migration nova; migration `0004` revisada só documentalmente.
- [x] Feedback do Bloco 07 criado e preenchido.
- [x] Nenhum commit/push/merge; Session 12 não encerrada formalmente.

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (todos os workspaces)
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine validate`
- [x] `npx ddae-engine audit`

## 11. Segurança

Revisão dedicada (seção 24 do prompt): ownership por household (nunca por `createdByUserId`), mensagens de erro sanitizadas (incluindo o teste novo desta rodada), nenhum segredo/`.env.local`/dado real no diff.

## 12. Performance

Não aplicável — bloco de validação, nenhuma consulta nova, nenhum componente novo.

## 13. Design System / UX

Não aplicável — nenhuma tela nova; confirmação de que o hotfix visual do Bloco 06 permanece intacto via teste estrutural já existente.

## 14. Riscos

- Risco de escopo: tentação de "melhorar" algo além de confirmar — mitigado pela regra explícita de só corrigir regressão pequena e direta, parando e reportando qualquer achado que exigisse schema/migration/API nova/regra financeira nova.
- Risco técnico: baixo — toda a superfície já foi testada nos Blocos 02–06; este bloco é majoritariamente confirmatório.

## 15. Pendências Esperadas

Nenhuma pendência técnica nova. Pendências já conhecidas e fora do MVP (exclusão global, encerramento antecipado, antecipação de parcelas) são reafirmadas como P4/evolução futura — ver seção 13 do feedback.

## 16. Feedback Obrigatório

Feedback gerado via `ddae-engine feedback create --block bloco_07_smoke_validacao_manual_e_encerramento_da_session_12 --session session_12_parcelamentos_e_compromissos_futuros` **após** todas as validações desta rodada.

## 17. Commit Semântico Sugerido

```
test(installments): smoke final e validacao de contratos da session 12
```

---

## 18. Executado — Checkpoint e Isolamento

`origin/main` no início desta rodada: `c4396f660d0a4336fe7b05147c53bcfbd33556c2` (Bloco 06 + hotfix visual, ambos já integrados). Worktree isolado criado a partir desse commit: `C:\Users\leoki\HouseManager-Session12-Bloco07`, branch `feat/session-12-bloco-07-smoke-encerramento`. Os dois documentos DDAE do Bloco 07, criados formalmente na rodada anterior no diretório original (`C:\Users\leoki\FinanHouse`, ainda na branch já mesclada do Bloco 06), foram copiados para este worktree — nunca recriados via `ddae-engine block create` — com verificação de hash SHA-256 idêntico antes/depois da cópia:

- `bloco_07_...md`: `8186b2dd6ccce4252f78838f8b4d47c349dd092c5e2152d05574bc1b61d147a4`
- `prompt_bloco_07_...md`: `ba2edd2dd60da04a00015c83ed9f4bcea9630405effee1ce5137520ce8921781`

Os originais permanecem intactos e não versionados em `C:\Users\leoki\FinanHouse`.

## 19. Executado — Inventário da Session 12 (reconstruído por documentação, não por memória)

| Bloco | Entregou | Fonte |
|---|---|---|
| 01 | Planejamento funcional, RF-10, 8 decisões de MVP (imutabilidade do plano, exclusão fora do MVP, `dueDay` no plano, arredondamento na última parcela, `createdByUserId` como autoria) | `feedback_bloco_01...md` |
| 02 | Domínio puro: `splitMoney`, avanço de competência, `generateInstallments`, `InstallmentPlan`/`GeneratedInstallment` | `feedback_bloco_02...md` |
| 03 | Schema/migration (`installment_plans`, colunas nullable em `financial_entries`), repositórios Drizzle/memória — migration gerada e revisada, não aplicada neste bloco | `feedback_bloco_03...md`, DT-17 |
| 04 | RS-01 resolvida: persistência atômica via `db.transaction()` nativo (`InstallmentTransactionRunner`), API `POST`/`GET` | `feedback_bloco_04...md`, DT-19 |
| 05 | Frontend de criação/listagem/detalhe, hooks page-scoped (`useInstallmentPlans`/`useInstallmentPlanDetail`), rotulagem pt-BR | `feedback_bloco_05...md` |
| 06 | Telas derivadas confirmadas sem alteração (Dashboard/Planejamento/Comparativo/Histórico), rótulo "Parcela N/Total", filtro Em andamento/Concluídos/Todos, "Marcar como pago" no detalhe, hotfix visual | `feedback_bloco_06...md` (três rodadas) |
| 07 | Este bloco — smoke final, revisão de contratos, encerramento técnico | Este documento |

Migration da Session 12 confirmada por `git log`/inspeção do arquivo: uma única (`database/migrations/0004_deep_machine_man.sql`), aplicada a `finanhouse_dev` em 2026-08-20 sob autorização explícita (DT-17), nenhuma segunda migration acidental — `drizzle-kit check` continua "Everything's fine" nesta rodada.

## 20. Executado — Revisão dos 14 Contratos Centrais

Todos confirmados por leitura de código e/ou teste já existente — nenhum por suposição:

1–2. **`InstallmentPlan` agrupador / `FinancialEntry` lançamento real** — `packages/domain/src/installment/installment-rules.ts` (tipos), DT-17/DT-19.
3. **Cada parcela com `installmentPlanId`/`installmentNumber`/`periodId`/valor/vencimento/status próprios** — `financial_entries` schema (migration 0004) + `generateInstallments` (domínio).
4. **Nenhum `installmentTotal` em `FinancialEntry`** — `grep -rn "installmentTotal" apps/ packages/` → zero ocorrências fora de comentários explicativos.
5–6. **`totalAmount`/`installmentCount` só no plano** — schema `installment_plans`, nunca replicados em `financial_entries`.
7. **Cada competência recebe só sua própria `FinancialEntry`** — `buildInstallmentPlanProgress`/view-models de cálculo filtram por `periodId` (Bloco 06, seção 19 do bloco).
8. **Dashboard/Planejamento/Comparativo/Histórico não usam `totalAmount` do plano** — confirmado por leitura direta dos quatro view-models (Bloco 06) e por todos os testes A–G continuarem passando sem tocar `InstallmentPlan`.
9. **Parcela realizada não redistribui siblings** — teste dedicado em `FinancialEntriesPage.test.tsx` ("realizar a parcela 2/3 não altera... as parcelas irmãs").
10. **Conclusão derivada (`realizedCount === installmentCount`)** — `installment-plan-view-model.ts`, `buildInstallmentPlanProgress.isCompleted`.
11. **Plano concluído sai de Em andamento, aparece em Concluídos/Todos, histórico preservado** — `filterInstallmentPlansByStatus` + testes de transição em `InstallmentPlansPage.test.tsx`.
12. **Exclusão global fora do MVP** — `grep -rn` por rota `DELETE .../installment-plans` → zero ocorrências; `InstallmentPlanRepository` deliberadamente sem `remove()` (DT-17).
13. **Encerramento antecipado fora do MVP** — `grep -rn "Finalizar parcelamento"` → zero ocorrências.
14. **Antecipação de parcelas é evolução futura** — nenhuma alteração de `periodId`/`realizationDate` fora do fluxo normal de realização; registrado como P4 nos feedbacks dos Blocos 06 e 07.

## 21. Executado — Smoke Local (sem Aiven)

Todos os cenários pedidos já possuíam cobertura de teste real, confirmada por execução da suíte completa e por inspeção direta dos arquivos de teste (citados por nome, não reconstruídos de memória):

- **Criação 1000/3 e arredondamento** — `installment-purchase-services.test.ts`: "R$ 1000,00 / 3 parcelas: 333.33 + 333.33 + 333.34, soma persistida exatamente 1000.00".
- **Avanço de competência / clamp de `dueDay`** — `installment-rules.test.ts`: dezembro→janeiro, dia 31 em fevereiro (28/29 bissexto), `dueDay` 1–31 percorrido exaustivamente.
- **Persistência atômica (RS-01)** — `installment-purchase-services.test.ts`, Casos B–F: rollback total testado em 5 pontos de falha (plano, parcela 1, parcela intermediária 6/10, última parcela 10/10, competência nova) + `InMemoryInstallmentTransactionRunner`/`DrizzleInstallmentTransactionRunner` (DT-19).
- **Listagem/detalhe** — `InstallmentPlansPage.test.tsx`: listagem real via API, seleção abre detalhe com todas as parcelas/valores/datas/status; nenhuma reconstrução textual.
- **Rotulagem "Parcela N/Total"** — `financial-entries-view-model.test.ts` (avulso sem rótulo, total conhecido, fallback "Parcela N", rótulo nunca inferido da descrição).
- **Dashboard/Planejamento/Comparativo/Histórico** — Casos A–G (Bloco 06): cada competência conta só sua própria parcela, nunca o total do plano; parcela `planned` entra em previsto sem tratamento especial; `realized` segue semântica normal.
- **"Marcar como pago" sem duplicação** — `InstallmentPlansPage.test.tsx`: mesmo `id`/`installmentPlanId`/`installmentNumber`/`periodId`, progresso "0 de 4"→"1 de 4", competência diferente da exibida realizada com sucesso, siblings intactos.
- **Hotfix visual** — teste estrutural dedicado ("carrega a classe que o alinha ao fim da linha, como último elemento do item") continua passando sem alteração.
- **Conclusão automática (3/4→4/4)** — teste de transição em `InstallmentPlansPage.test.tsx`, `isCompleted` nunca persistido.
- **Lançamento avulso** — Caso G (Bloco 06) e fixtures avulsas em todos os quatro view-models de cálculo, sem regressão.
- **Erros sanitizados** — `entries.test.ts`/`installment-plans.test.ts`: payload inválido (400), `installmentCount`/`dueDay`/valor inválidos (400), categoria de outro household (409), competência fechada (409, mensagem "Não é possível... em uma competência fechada."), conexão simulada (503, `DEPENDENCY_UNAVAILABLE`) — nenhum SQL/stack/Aiven/connection string exposto (confirmado por asserção direta em todos os testes de erro).
- **Dinheiro (`Money = bigint`)** — nenhuma ocorrência de `parseFloat`/`Number(...)` como fonte de verdade monetária nos caminhos alterados pela Session 12 (`grep` direcionado; os únicos usos de `Number(...)` encontrados são inteiros não-monetários: `categoryId`, `installmentCount`, `dueDay`, e componentes de data em `installment-rules.ts`).
- **Household/autoria** — `GET .../installment-plans` e `GET .../installment-plans/:id` filtram exclusivamente por `householdId` (nunca por `createdByUserId`); `createdByUserId` só é gravado na criação, nunca usado como filtro de visibilidade (confirmado por leitura de `installment-plans.ts`).

**Único teste novo desta rodada** (gap real, não redundante): `installment-plans.test.ts` ganhou "erro de conexão do repositório vira 503 sanitizado" para `GET .../installment-plans` — o mesmo padrão já provado para `entries`, mas que nunca havia sido testado especificamente nesta rota. Nenhum código de produção foi alterado para fazer esse teste passar — a sanitização já existia na camada compartilhada de repositório/erro.

## 22. Executado — Resultado da Suíte e Validações

Baseline no início desta rodada: API 667, Web 463, Domain 214, Total 1344 (herdado de `origin/main` após o Bloco 06 + hotfix). Após o único teste novo:

- API: 667 → **668** (+1).
- Web: 463 → 463 (inalterado).
- Domain: 214 → 214 (inalterado).
- Total: 1344 → **1345**.

Todas as validações obrigatórias da seção 10 passaram limpas: `build`, `verify:runtime`, `lint`, `typecheck`, `typecheck:api-scripts`, `test` (as três suítes), `drizzle-kit check` ("Everything's fine"), `ddae-engine validate` (0/0), `ddae-engine audit` (0 erros, 0 P1/P2, 9 warnings — os 8 estruturais já conhecidos + "Bloco 07 sem feedback correspondente", que deixa de existir assim que o feedback for criado).

## 23. Executado — Segurança e Git

`git status`/`git diff --stat`/`git diff --name-only`/`git diff --check` — apenas `installment-plans.test.ts` alterado, nenhum arquivo inesperado, `git diff --check` limpo. `git diff origin/main` confirma o mesmo único arquivo. `.env.local` de `api`/`web` confirmados ignorados. Nenhum segredo, credencial, cookie, certificado, log, screenshot ou artefato de build no diff. Nenhuma migration criada; nenhum acesso ao Aiven; nenhum dado real alterado.

## 24. Executado — Encerramento Técnico (não formal)

Bloco 07 **aprovado pelo usuário em 2026-08-28**. Session 12 **7/7 blocos**, aprovada para encerramento formal — condicionado ao merge deste bloco na `main` (executado em rodada subsequente).
