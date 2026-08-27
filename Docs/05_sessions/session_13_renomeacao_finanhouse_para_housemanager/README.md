# Session 13 — Renomeação FinanHouse para HouseManager

> Projeto: HouseManager · Atualizado em: 2026-08-27

> Este README é o ponto de entrada da sessão. Qualquer pessoa ou agente de IA deve conseguir, lendo só este arquivo, entender o que esta sessão faz, o que já está pronto e qual é o próximo passo — sem precisar abrir todas as subpastas.

## 1. Objetivo

Transformar a identidade pública do produto de "FinanHouse" para "HouseManager", preservando integralmente identificadores técnicos internos, infraestrutura e histórico DDAE — sem implementar nenhuma funcionalidade nova.

## 2. Contexto

O proprietário do projeto decidiu reposicionar o produto: HouseManager passa a ser uma central de gerenciamento da casa (finanças é um domínio importante, não o produto inteiro). A Sessão 12 (parcelamentos) estava com o Bloco 06 aberto e documentação não commitada no momento da decisão — para não misturar uma mudança transversal de identidade com desenvolvimento funcional em andamento, esta sessão roda isolada num worktree Git separado, a partir de `main`, sem tocar o trabalho pendente da Sessão 12.

## 3. Escopo

- Inventário completo de ocorrências de "FinanHouse"/variações no repositório, classificadas por contexto (identidade pública, identificador técnico, infraestrutura, banco, histórico).
- Renomeação de toda identidade pública real (título HTML, textos de marca/login/erro/status, aria-labels, READMEs descritivos, `package.json` description, cabeçalho `> Projeto:` dos documentos DDAE atuais).
- Registro formal da decisão (DT-20) e desta sessão.

## 4. Fora de Escopo

- Qualquer identificador técnico interno (`@finanhouse/domain`, classes CSS `fh-*`, filename/variável do asset de logo) — permanece.
- Infraestrutura (banco `finanhouse_dev`/`finanhouse_prod`, Aiven, cookie de sessão, variáveis de ambiente `FINANHOUSE_*`) — permanece.
- Reescrita de qualquer documento histórico da Sessão 01 a 12 — permanece.
- Renomeação de repositório GitHub, projeto Vercel, pasta local `C:\Users\leoki\FinanHouse` — avaliar futuramente.
- Substituição do asset visual `finanhouse-logo-hero.png` (contém a palavra "Finanhouse" desenhada na imagem) — pendência registrada, não resolvida aqui.
- Implementação de novos módulos (Agenda, Casa, linha do tempo doméstica) — sessões futuras.

## 5. Status

- [x] Concluída (Bloco 01 — único bloco desta sessão)

## 6. Documentos Obrigatórios Desta Sessão

- [x] `01_intake/levantamento_inicial.md` — não aplicável de forma extensa (sessão de renomeação, não de produto novo); ver inventário no feedback do Bloco 01.
- [x] `02_analysis/` — inventário/classificação de ocorrências documentado no bloco e no feedback.
- [x] `04_planning/plano_execucao.md` — um único bloco.
- [x] `05_blocks/` — `bloco_01_atualizacao_da_identidade_publica_para_housemanager.md`.
- [x] `06_prompts/` — `prompt_bloco_01_atualizacao_da_identidade_publica_para_housemanager.md`.
- [x] `08_feedbacks/` — `feedback_bloco_01_atualizacao_da_identidade_publica_para_housemanager.md`.
- [x] `09_validation/fechamento_sessao.md` — preenchido ao final.

## 7. Blocos Planejados

| Bloco | Título | Status |
|---|---|---|
| 01 | Atualização da identidade pública para HouseManager | Concluído (aguardando revisão/autorização de versionamento) |

## 8. Riscos

Risco de escopo: confundir "renomear a identidade pública" com "renomear tudo que contém a string FinanHouse" — mitigado pela classificação explícita por contexto antes de qualquer edição (ver Bloco 01). Risco técnico: baixo — nenhuma migration, endpoint, storage key ou infraestrutura foi alterada.

## 9. Dependências

Base: `main` em `7b27f02703de6cfa4719d561fafd7467b4646021` (após a Sessão 12, Bloco 05 integrado e correção documental de data). Executada em worktree isolado (`C:\Users\leoki\HouseManager-Rename`, branch `feat/session-13-renomeacao-housemanager`) para não interferir no Bloco 06 da Sessão 12, que permanece pausado e intocado no diretório original.

## 10. Resultado

Identidade pública renomeada para "HouseManager" em todos os textos voltados ao usuário (título, marca, login, erros, status, navegação) e em toda documentação DDAE atual/viva (29 cabeçalhos `> Projeto:`). Identificadores técnicos, infraestrutura e histórico preservados integralmente (ver DT-20 e feedback do Bloco 01 para o inventário completo com justificativa por categoria). Suíte completa sem regressão de comportamento (API 667, Web 420, Domain 214 — total 1301, inalterado). Pendência explícita: asset visual do logo ainda exibe "Finanhouse" graficamente — substituição fica para uma rodada futura de design.

## 11. Próxima Sessão

A definir pelo proprietário do projeto — retomar a Sessão 12 (Bloco 06, pausado e intocado) ou avançar com os módulos futuros do HouseManager, conforme prioridade.
