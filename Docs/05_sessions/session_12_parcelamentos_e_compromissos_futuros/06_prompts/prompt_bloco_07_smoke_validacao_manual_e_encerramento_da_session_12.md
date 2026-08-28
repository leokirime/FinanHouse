# Prompt — Bloco 07: Smoke, validação manual e encerramento da Session 12

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_07_smoke_validacao_manual_e_encerramento_da_session_12.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Confirmar por smoke local (testes/inspeção, sem Aiven) que os seis blocos anteriores da Session 12 continuam consistentes e sem regressão, e preparar — sem executar — o encerramento formal.

## 3. Escopo

Revisão dos 14 contratos centrais de parcelamentos, smoke local de todos os fluxos (criação/arredondamento, atomicidade, listagem/detalhe, rotulagem, telas de cálculo, "Marcar como pago", conclusão automática, avulso, erros sanitizados, dinheiro, household), um teste novo somente se um gap real for encontrado, documentação de encerramento técnico, feedback do bloco.

## 4. Fora de Escopo

Qualquer acesso ao Aiven, migration, funcionalidade nova (exclusão global, encerramento antecipado, antecipação de parcelas), commit/push/merge, encerramento formal da Session 12, criação de Session 14.

## 5. Arquivos Permitidos

- Qualquer arquivo de teste existente, apenas se um gap real de cobertura for encontrado (nenhuma alteração de produção esperada).
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_07_...md`, `06_prompts/prompt_bloco_07_...md`, `08_feedbacks/feedback_bloco_07_...md`.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Se um teste revelar necessidade de schema/migration/API nova/regra financeira nova/arquitetura nova: PARE e reporte, não implemente.

## 7. Restrições de Segurança

Revisar ownership (household, nunca `createdByUserId` como filtro de visibilidade), autenticação/autorização já existentes, sanitização de erro (nenhum SQL/stack/Aiven/connection string exposto). Nenhuma alteração deve enfraquecer contrato de segurança existente.

## 8. Restrições de Performance

Não aplicável — bloco de validação, nenhuma consulta nova.

## 9. Restrições de Design System

Não aplicável — nenhuma tela nova; apenas confirmação de que o hotfix visual do Bloco 06 permanece intacto.

## 10. Tarefas

1. Checkpoint de git e isolamento em worktree próprio, preservando os documentos DDAE já criados (cópia com verificação de hash, nunca recriação).
2. Reconstruir o inventário dos 7 blocos via documentação real (feedbacks, decisões técnicas, `plano_execucao.md`).
3. Revisar os 14 contratos centrais por código/teste, citando evidência.
4. Confirmar cobertura de smoke local para todos os fluxos pedidos; identificar e fechar apenas gaps reais e pequenos.
5. Rodar a suíte completa e todas as validações obrigatórias.
6. Auditoria de git/segurança.
7. Atualizar este bloco/prompt com evidência de execução.
8. Criar e preencher o feedback do Bloco 07.

## 11. Critérios de Aceite

- [x] Inventário dos 7 blocos reconstruído a partir de documentação real.
- [x] Os 14 contratos centrais confirmados por código/teste.
- [x] Smoke local completo, sem Aiven.
- [x] Nenhuma regressão em nenhuma suíte.
- [x] Nenhuma migration nova.
- [x] Feedback do Bloco 07 criado.
- [x] Nenhum commit/push/merge; Session 12 não encerrada formalmente.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test`
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_07_smoke_validacao_manual_e_encerramento_da_session_12 --session session_12_parcelamentos_e_compromissos_futuros
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Status: **Aprovado** — ver seção 1/16 do feedback.

## 15. Commit Semântico Sugerido

```
test(installments): smoke final e validacao de contratos da session 12
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.

---

## 17. Executado — Evidência

Checkpoint: `origin/main = c4396f660d0a4336fe7b05147c53bcfbd33556c2` no início da rodada (Bloco 06 + hotfix visual já integrados). Worktree isolado `C:\Users\leoki\HouseManager-Session12-Bloco07`, branch `feat/session-12-bloco-07-smoke-encerramento`, criada diretamente de `origin/main`. Os dois documentos DDAE do Bloco 07 foram copiados do diretório original (nunca recriados via `ddae-engine block create`), com hash SHA-256 idêntico confirmado antes e depois da cópia.

Os 14 contratos centrais e todos os fluxos de smoke pedidos (criação/arredondamento, atomicidade/rollback, listagem/detalhe, rotulagem, Dashboard/Planejamento/Comparativo/Histórico, "Marcar como pago" sem duplicação, hotfix visual, conclusão automática, avulso, erros sanitizados, dinheiro/bigint, household/autoria) foram confirmados por leitura de código e pela suíte de testes já existente dos Blocos 02–06 — detalhe completo nas seções 19–21 do bloco (`05_blocks/bloco_07_...md`).

Único teste novo, legítimo (gap real, não redundante): sanitização de erro de conexão (503) especificamente em `GET .../installment-plans` — mesmo padrão já provado para `entries`, nunca testado nesta rota. Nenhum código de produção foi alterado.

Resultado: API 667 → 668 (+1), Web 463 (inalterado), Domain 214 (inalterado). Total 1344 → 1345. Todas as validações da seção 12 passaram limpas. `ddae-engine audit`: 0 erros, 0 P1/P2, 9 warnings nesta execução (8 estruturais já conhecidos + "Bloco 07 sem feedback", que desaparece assim que o feedback for criado).

**Aprovado pelo usuário em 2026-08-28.** Session 12 em 7/7, aprovada para encerramento formal após o merge deste bloco.
