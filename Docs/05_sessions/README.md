# Sessões

> Projeto: FinanHouse · Atualizado em: 2026-08-19

## 1. O que é uma sessão

Uma sessão é um trabalho real do projeto — não uma pasta de exemplo, não uma categoria fixa, não uma etapa genérica do ciclo de vida de software. `Docs/05_sessions/` começa **vazia** logo após `ddae-engine init`: nenhuma sessão é criada antecipadamente.

Uma sessão só existe quando alguém decide começar um trabalho concreto e roda:

```bash
ddae-engine session create "<nome>"
```

A primeira sessão criada em qualquer projeto é sempre `session_01_<nome>`. A segunda é `session_02_<nome>`, e assim por diante — a numeração conta apenas sessões reais já criadas, ignorando lacunas propositais (se `session_01` e `session_03` existem, a próxima é `session_04`).

## 2. Sessão vs. módulo

Não confunda os dois conceitos:

| | O que é | Exemplo |
|---|---|---|
| **Sessão** | Unidade real de trabalho do projeto. Numerada, criada sob demanda. | `session_11_fundacao_do_finanhouse`, `session_12_parcelamentos_e_compromissos_futuros` |
| **Módulo** | Categoria interna que organiza o conteúdo de uma sessão. Sempre as mesmas 13, geradas automaticamente dentro de cada sessão. | `05_blocks/`, `08_feedbacks/`, `09_validation/` |

Os módulos nunca são contados como sessões, e nunca existem soltos em `Docs/05_sessions/` — eles só existem dentro de uma sessão real.

## 3. Estrutura de uma sessão

```text
Docs/05_sessions/
├── README.md                     Este arquivo.
└── session_01_<nome>/
    ├── README.md                 Objetivo, escopo, status e resultado da sessão.
    ├── 01_intake/                Levantamento inicial do que a sessão precisa cobrir.
    ├── 02_analysis/               Análise funcional, técnica, arquitetural e de riscos.
    ├── 03_ideas/                  Ideias e melhorias capturadas durante a sessão.
    ├── 04_planning/                Plano de execução e mapa de dependências entre blocos.
    ├── 05_blocks/                  Um arquivo .md por bloco de execução.
    ├── 06_prompts/                 Um prompt gerado por bloco.
    ├── 07_bugs/                    Bugs identificados e corrigidos durante a sessão.
    ├── 08_feedbacks/               Um feedback por bloco concluído.
    ├── 09_validation/               Fechamento formal da sessão.
    ├── 10_tests/                    Plano de testes e registro de regressão.
    ├── 11_security/                 Checklist de segurança aplicado na sessão.
    ├── 12_performance/              Checklist de performance aplicado na sessão.
    └── 13_release/                  Changelog e release notes gerados pela sessão.
```

## 4. Como trabalhar com sessões

1. **Criar a sessão:** `ddae-engine session create "autenticacao"` → `Docs/05_sessions/session_01_autenticacao/`, com os 13 módulos já criados dentro dela.
2. **Criar um bloco** dentro da sessão: `ddae-engine block create "<nome>" --session session_01_autenticacao` → `05_blocks/bloco_01_<nome>.md`.
3. **Gerar o prompt** do bloco: `ddae-engine prompt create --block bloco_01_<nome> --session session_01_autenticacao`.
4. **Implementar** contra o que o bloco e o prompt descrevem.
5. **Gerar o feedback** de fechamento do bloco: `ddae-engine feedback create --block bloco_01_<nome> --session session_01_autenticacao`.
6. **Encerrar a sessão** preenchendo `09_validation/fechamento_sessao.md` quando todos os blocos planejados estiverem concluídos.
7. **Validar e auditar** com `ddae-engine validate` e `ddae-engine audit` antes de considerar a sessão pronta.

Ver `Docs/00_ddae_engine/metodologia.md` para o fluxo completo e `Docs/00_ddae_engine/folder_schema.md` para a convenção de nomenclatura.

## 5. Sessões deste projeto

Índice das sessões reais do FinanHouse — não substitui nem resume o conteúdo de cada `session_NN_<nome>/README.md`, apenas aponta para onde cada uma está.

| Sessão | Nome | Status | Blocos |
|---|---|---|---|
| `session_11_fundacao_do_finanhouse` | Fundação do FinanHouse | Em andamento — 20 blocos concluídos (Bloco 20 mergeado em `main`, commit `ae6bf3d`) | 20 |
| `session_12_parcelamentos_e_compromissos_futuros` | Parcelamentos e Compromissos Futuros | Em andamento — Bloco 01 (planejamento funcional e contratos) | 1 |

`session_01_project_foundation` a `session_10_final_audit` são pastas do scaffold automático padrão do `ddae-engine` (categorias genéricas pré-criadas por uma versão anterior da ferramenta) — **nenhuma delas foi usada como sessão real neste projeto**: estão vazias (0 blocos cada) e não representam trabalho concluído nem em andamento. Mantidas sem alteração por decisão explícita (ver o feedback do Bloco 01 da Sessão 12, pendência P4) — não renumeradas, não consolidadas, não removidas.
