# Prompt — Bloco 01: Planejamento funcional e contratos de parcelamentos

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_01_planejamento_funcional_e_contratos_de_parcelamentos.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Fechar o escopo funcional de parcelamentos (RF-10), confrontar a direção arquitetural proposta com o código real do FinanHouse, e resolver as perguntas de produto em aberto — sem escrever nenhum código de implementação.

## 3. Escopo

Registro de RF-10; levantamento/análises da Sessão 12 (`01_intake/`, `02_analysis/`); decisões arquiteturais já resolvidas nesta etapa (`first_reference_month` como data solta, geração de id via `insertId` desde o início); plano de execução dos Blocos 02–07; branch dedicada.

## 4. Fora de Escopo

Qualquer código de domínio/schema/migration/serviço/rota/UI; recorrências genéricas; edição de plano já criado; aplicação de migration real; deploy/produção.

## 5. Arquivos Permitidos

- `Docs/01_product/requisitos_funcionais.md`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/**`

Nenhum arquivo em `packages/`, `apps/` ou `database/` é permitido neste bloco.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Não escreva código de implementação neste bloco — apenas planejamento e documentação.
- Não crie/aplique migration.
- Não faça merge na `main` sem nova autorização explícita.

## 7. Restrições de Segurança

Não aplicável — nenhum código é escrito neste bloco. Os princípios de segurança já vigentes (household sempre no filtro, `createdByUserId` da sessão, nunca soft delete — DT-09/DT-14/DT-16) devem ser respeitados quando a implementação real começar (Bloco 03 em diante).

## 8. Restrições de Performance

Não aplicável — ver `02_analysis/analise_arquitetural.md`, seção 4, para a análise de impacto esperado (baixo) a valer nos blocos de implementação.

## 9. Restrições de Design System

Não aplicável — nenhuma tela é tocada neste bloco. Reaproveitamento de `EntryDialog`/`useMutationDialog`/`FinancialEntryList` já registrado como intenção para os Blocos 05–06.

## 10. Tarefas

1. Levantar contexto e necessidades.
2. Analisar funcionalmente cada fluxo, ligado a RF-10.
3. Confrontar a arquitetura proposta com o código real (domínio, schema, lição de DT-15/DT-16).
4. Detalhar a abordagem técnica de cada aspecto não trivial (divisão monetária, avanço de competência, vencimento em dia inválido, geração em lote).
5. Mapear riscos e decisões adiadas.
6. Traduzir em plano de execução de 7 blocos + mapa de dependências.
7. Registrar RF-10.
8. Criar branch dedicada a partir de uma `main` confirmada limpa/sincronizada.
9. Validar (sem alteração de código, suíte deve continuar em 1098 testes).
10. Gerar feedback e parar para revisão.

## 11. Critérios de Aceite

- [x] RF-10 registrado com critérios de aceite verificáveis.
- [x] Todas as perguntas do levantamento inicial têm resposta definitiva registrada — sem seção "Perguntas Abertas" remanescente.
- [x] `first_reference_month`, estratégia de geração de id, imutabilidade do plano, `dueDay`, exclusão sem cascata e `createdByUserId` (autoria-apenas) têm decisão explícita e justificada.
- [x] Invariantes de domínio para o Bloco 02 registradas.
- [x] Plano de execução cobre os 7 blocos com dependências e critério de sequenciamento.
- [x] Branch dedicada criada a partir de `main` limpa e sincronizada.
- [x] Nenhum código de produção alterado.
- [x] `ddae-engine validate` retorna `Status: OK`.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `ddae-engine audit`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` — 1098 testes, sem mudança

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_01_planejamento_funcional_e_contratos_de_parcelamentos --session session_12_parcelamentos_e_compromissos_futuros
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Ver `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/08_feedbacks/feedback_bloco_01_planejamento_funcional_e_contratos_de_parcelamentos.md` para o status final.

## 15. Commit Semântico Sugerido

```
docs(session-12): planejar funcionalmente e arquiteturalmente parcelamentos e compromissos futuros
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
