# Metodologia DDAE Engine

> Projeto: HouseManager · Atualizado em: 2026-07-25

## 1. O que é DDAE Engine

DDAE Engine — **Document-Driven AI Engineering Engine** — é uma metodologia onde os documentos em `Docs/` são a fonte da verdade do projeto, não o código. Antes de qualquer linha de código ser escrita, o que deve ser construído, por quê e dentro de quais limites já está registrado em um documento. O código é a implementação do que o documento descreve — nunca o contrário.

Isso existe porque agentes de IA (e equipes humanas) perdem contexto entre sessões de trabalho. Sem um registro estruturado e persistente de intenção, cada nova sessão precisa re-derivar escopo a partir do prompt e do código existente — e cada re-derivação se afasta um pouco mais do design original. A DDAE Engine resolve isso fixando intenção, decisões e validações em documentos versionados junto com o código.

## 2. Por que a documentação vem primeiro

- **Escopo explícito.** Um requisito em `Docs/01_product/requisitos_funcionais.md` define o que deve ser construído antes que qualquer prompt de execução seja escrito.
- **Decisões rastreáveis.** Decisões caras de reverter são registradas em `Docs/04_governance/registro_decisoes.md`, não apenas implícitas em um diff de código.
- **Execução fragmentada e auditável.** Trabalho não é "uma feature grande"; é uma sequência de blocos, cada um com objetivo, escopo, critérios de aceite e fechamento documentado.
- **Continuidade entre agentes.** Qualquer agente de IA (Claude Code, Codex, Cursor, Copilot ou outro) consegue retomar o trabalho lendo os documentos, sem depender de memória de conversa.

## 3. Fluxo Oficial de Trabalho

```
Sessão → Bloco → Prompt → Implementação → Feedback → Validação → Próximo Bloco
```

1. **Sessão** (`Docs/05_sessions/session_NN_<nome>/`) agrupa um conjunto coerente de blocos em torno de um tema (ex.: fundação do produto, autenticação, performance).
2. **Bloco** (`05_blocks/bloco_NN_<nome>.md`) é a unidade de execução: uma tarefa delimitada, com escopo e critérios de aceite explícitos. Criado com `ddae-engine block create "<nome>" --session <sessao>`.
3. **Prompt** (`06_prompts/prompt_<bloco>.md`) traduz o bloco em instruções executáveis para um agente de IA. Gerado com `ddae-engine prompt create --block <bloco> --session <sessao>`.
4. **Implementação** acontece contra o que o bloco e o prompt descrevem — não contra suposições adicionais do agente.
5. **Feedback** (`08_feedbacks/feedback_<bloco>.md`) registra o que foi de fato implementado, o que mudou, o que ficou pendente. Gerado com `ddae-engine feedback create --block <bloco> --session <sessao>`.
6. **Validação** decide se o bloco é aprovado e se o próximo pode começar.
7. O ciclo se repete para o próximo bloco, dentro da mesma sessão ou em uma nova.

## 4. Papel da Documentação

A documentação em `Docs/` não é um artefato secundário gerado depois do código — ela é o que autoriza o código a existir. Um agente de IA que recebe uma tarefa sem requisito correspondente em `Docs/01_product/requisitos_funcionais.md` deve parar e perguntar, não inferir e implementar.

## 5. Papel dos Agentes de IA

Agentes de IA (humanos também, mas o framework é desenhado para tornar isso possível mesmo sem memória entre sessões) devem:

- Ler `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md` antes de implementar.
- Ler o bloco ativo antes de alterar código.
- Não expandir escopo sem autorização explícita.
- Não commitar sem confirmação do usuário.
- Gerar feedback ao final de cada bloco.
- Respeitar contratos técnicos (`Docs/03_contracts/`), design system (`Docs/07_design_system/`) e quality gates (`Docs/06_quality_gates/`).
- Registrar pendências usando a escala P1–P4 (seção 7).

Ver `Docs/00_ddae_engine/regras_ddae_engine.md` para a lista completa de regras obrigatórias.

## 6. Regra de Feedback

Todo bloco termina com um feedback. Sem feedback, o bloco não está concluído — está apenas implementado. O feedback é o que permite a um agente futuro (ou a um humano revisando depois) entender o que aconteceu sem precisar reconstruir o raciocínio a partir do diff.

## 7. Regra de Validação

A validação é o gate de liberação do próximo bloco. Um bloco aprovado libera o próximo; um bloco bloqueado ou reprovado não libera nada até que as pendências críticas (P1) sejam resolvidas. Use `ddae-engine validate` para checar conformidade estrutural do `Docs/` e `ddae-engine audit` para encontrar blocos, prompts ou feedbacks órfãos.

## 8. Regra de Commit Semântico

Todo bloco encerra com uma sugestão de commit semântico (`feat`, `fix`, `docs`, `refactor`, etc.), mas **o commit nunca é automático** — exige confirmação explícita do usuário antes de `git add`/`git commit`/`git push`.

## 9. Padrão de Sessões

Uma sessão é um agrupamento temático de blocos (ex.: `session_05_auth_security`). As 10 sessões base criadas por `ddae-engine init` são um ponto de partida, não um limite — `ddae-engine session create "<nome>"` numera a próxima automaticamente (`session_11`, `session_12`, ...).

## 10. Padrão de Blocos

Um bloco é a menor unidade de execução com escopo fechado. Veja `Docs/00_ddae_engine/folder_schema.md` para a estrutura interna de uma sessão e `src/templates/block/bloco_template.md` (no CLI) para a estrutura de um bloco.

## 11. Padrão de Prompts

Um prompt é gerado a partir de um bloco existente e deve ser autossuficiente: colável diretamente em qualquer agente de IA, sem depender de contexto de conversa anterior.

## 12. Padrão de Pendências (P1–P4)

| Prioridade | Significado | Bloqueia o próximo bloco? |
|---|---|---|
| **P1 — Crítica** | Falha que compromete segurança, integridade de dados ou funcionamento básico. | Sim. |
| **P2 — Importante** | Lacuna relevante que deveria ser resolvida em breve, mas não impede o uso atual. | Normalmente não, salvo decisão explícita. |
| **P3 — Melhoria Recomendada** | Oportunidade de melhoria sem urgência. | Não. |
| **P4 — Opcional** | Ideia ou refinamento de baixo impacto. | Não. |

## 13. Veja Também

- `Docs/00_ddae_engine/regras_ddae_engine.md` — regras obrigatórias e boas práticas.
- `Docs/00_ddae_engine/folder_schema.md` — estrutura de pastas e convenções de nomenclatura.
- `Docs/00_ddae_engine/glossario.md` — termos usados em toda a documentação.
