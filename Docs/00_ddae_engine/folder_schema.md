# Folder Schema

> Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Estrutura de Pastas

```
Docs/
├── 00_ddae_engine/             Metodologia, regras, este schema, glossário.
├── 01_product/          Visão de produto, proposta, público, requisitos.
├── 02_architecture/     Arquitetura base, stack, estrutura, decisões, riscos.
├── 03_contracts/        Contratos entre frontend/backend, banco, auth, env, deploy.
├── 04_governance/       Convenções de código/commit/branch, matriz de riscos, decisões.
├── 05_sessions/         Uma pasta por sessão (ver seção 2).
├── 06_quality_gates/    Checklists de aprovação por área (arquitetura, segurança, etc.).
├── 07_design_system/    Identidade visual, tokens, componentes, responsividade, acessibilidade.
├── 08_deploy/           Deploy local/homologação/produção, troubleshooting.
├── 09_observability/    Logs, métricas, monitoramento, incidentes.
└── 99_archive/          Documentos superados, mantidos como referência histórica.
```

Na raiz do projeto (fora de `Docs/`):

```
CLAUDE.md             Regras para Claude Code.
AGENTS.md             Regras agnósticas de provedor, aplicáveis a qualquer agente de IA.
.cursorrules           Regras para Cursor.
ddae-engine.config.json       Configuração do projeto (versão da DDAE Engine, diretório de docs).
```

## 2. Estrutura Interna de uma Sessão

```
Docs/05_sessions/session_NN_<nome>/
├── README.md            Visão geral da sessão: objetivo, status, próximo passo.
├── 01_intake/            Levantamento inicial do que a sessão precisa cobrir.
├── 02_analysis/          Análise funcional, técnica, arquitetural e de riscos.
├── 03_ideas/             Ideias e melhorias capturadas durante a sessão.
├── 04_planning/          Plano de execução e mapa de dependências entre blocos.
├── 05_blocks/            Um arquivo .md por bloco de execução.
├── 06_prompts/           Um prompt gerado por bloco, pronto para colar em um agente.
├── 07_bugs/              Bugs identificados e corrigidos durante a sessão.
├── 08_feedbacks/         Um feedback gerado por bloco, registrando o que foi feito.
├── 09_validation/        Fechamento formal da sessão.
├── 10_tests/             Plano de testes e registro de regressão.
├── 11_security/          Checklist de segurança aplicado na sessão.
├── 12_performance/       Checklist de performance aplicado na sessão.
└── 13_release/           Changelog e release notes gerados pela sessão.
```

As 10 sessões base (`session_01` a `session_10`) cobrem o ciclo de vida típico de um projeto (fundação, arquitetura, design system, features, segurança, qualidade, performance, deploy, observabilidade, auditoria final) — mas são apenas um ponto de partida. `ddae-engine session create "<nome>"` continua a numeração a partir de `session_11`.

## 3. Convenções de Nomenclatura

- **snake_case** para todo arquivo e pasta gerado pela DDAE Engine: `requisitos_funcionais.md`, `session_11_dashboard_admin`, `bloco_01_login_administrativo.md`.
- **Sem acentos.** "Configuração" → `configuracao`. Acentos são removidos automaticamente pelo CLI ao gerar nomes (`slugify`), e `ddae-engine validate` reporta como erro qualquer nome acentuado encontrado manualmente.
- **Sem espaços.** Espaços em nomes de arquivo/pasta são sempre convertidos para `_` pelo CLI; se aparecerem em nomes criados manualmente, `ddae-engine validate` reporta como erro.
- **Numeração com 2 dígitos, zero-padded.** `session_01`, não `session_1`; `bloco_01`, não `bloco_1`. Isso mantém a ordenação alfabética e numérica consistentes.
- **`README.md` é o único nome convencional em UPPERCASE aceito** dentro de `Docs/` — usado consistentemente como o documento de entrada de uma pasta (sessão, `99_archive/`, etc.).
- **Nomes técnicos do CLI permanecem em inglês** (`init`, `session create`, `block create`, `validate`, `audit`, nomes de flags como `--dir`/`--force`), mesmo quando o conteúdo dos documentos gerados está em português.
