# Tokens de Design

> Projeto: HouseManager · Atualizado em: 2026-08-01

> Tokens são a fonte única da verdade para valores visuais. Se um valor não está aqui como token, ele não deveria estar hardcoded em um componente.

## 1. Objetivo

Centralizar todo valor visual reutilizável (cor, espaçamento, tipografia, raio, sombra) em tokens nomeados, para que mudar um valor não exija caçar ocorrências no código.

Implementados em `apps/web/src/styles/tokens.css` (Bloco 06) como propriedades CSS customizadas (`--fh-*`), carregados por `styles/global.css`.

## 2. Cores

| Token | Valor | Uso |
|---|---|---|
| `--fh-bg` | `#0a0710` | Fundo principal da aplicação |
| `--fh-bg-elevated` | `#100b1a` | Fundo da sidebar |
| `--fh-surface` | `#151020` | Superfície de cards |
| `--fh-surface-elevated` | `#1c1529` | Superfície elevada (hover, cards em destaque) |
| `--fh-purple` | `#9b5de5` | Marca — CTAs |
| `--fh-purple-strong` | `#b98bff` | Marca — destaque, texto de gradiente |
| `--fh-purple-soft` / `--fh-purple-border` / `--fh-purple-glow` | `rgba(155,93,229,*)` | Fundos/bordas/brilho suaves de destaque |
| `--fh-text` | `#f5f2fb` | Texto principal |
| `--fh-text-secondary` | `#ada4c4` | Texto secundário |
| `--fh-text-muted` | `#756c8c` | Texto terciário / labels |
| `--fh-border` / `--fh-border-strong` | `rgba(245,242,251,*)` | Divisores |
| `--fh-income` | `#4fd1a5` | Destaque pontual de receita (nunca dominante) |
| `--fh-expense` | `#f2718a` | Destaque pontual de despesa |
| `--fh-warning` | `#f5b95c` | Pendências / competência em revisão |

## 3. Espaçamento

Escala base 4px: `--fh-space-1` (4px) até `--fh-space-12` (48px) — `1, 2, 3, 4, 5, 6, 8, 10, 12` como sufixo (`--fh-space-4` = 16px, etc.).

## 4. Tipografia

| Token | Família | Observação |
|---|---|---|
| `--fh-font-sans` | Inter, system-ui, 'Segoe UI', Roboto, sans-serif | Única família usada — tamanhos definidos por componente (13–22px), sem token dedicado por não haver ainda uma escala tipográfica extensa neste bloco. |

## 5. Raio e Sombra

| Token | Valor |
|---|---|
| `--fh-radius-sm` | 8px |
| `--fh-radius-md` | 14px |
| `--fh-radius-lg` | 20px |
| `--fh-radius-pill` | 999px |
| `--fh-shadow-sm` | sombra sutil (elementos pequenos) |
| `--fh-shadow-md` | sombra padrão de card |
| `--fh-shadow-lg` | sombra de hover/destaque |
| `--fh-shadow-purple` | brilho roxo controlado (CTAs, item de navegação ativo) |

## 6. Layout

| Token | Valor |
|---|---|
| `--fh-sidebar-width` | 264px |
| `--fh-sidebar-width-collapsed` | 76px (reservado — não usado neste bloco, sidebar vira barra horizontal em telas estreitas) |
| `--fh-content-max-width` | 1280px |
| `--fh-header-height` | 72px |

## 7. Regras Obrigatórias

- [x] Todo valor visual usado mais de uma vez no código tem um token correspondente aqui.
- [x] Nenhum componente usa valor de cor/espaçamento hardcoded quando um token equivalente já existe (exceção: cores semânticas de status específicas de badges, que herdam diretamente dos tokens de cor via seletor `data-tone`).
- [x] A logo oficial foi adicionada. Os tokens `--fh-brand-surface`/`--fh-brand-surface-border`, criados quando a logo ainda ocupava uma coluna própria no hero, foram removidos no Bloco 15 — a imagem (RGBA, transparência real) passou a ser exibida diretamente sobre o card, sem superfície própria, como elemento decorativo pequeno no canto superior esquerdo (posição corrigida retrospectivamente no Bloco 16; a implementação original do Bloco 15 usou o canto superior direito).

## 8. Perguntas Orientadoras

- Este token está implementado no código (variável CSS, tema, objeto de design tokens) exatamente como documentado aqui?

## 9. Decisões Pendentes

_Nenhuma pendência de tokens. Pendências de logo (versão compacta para sidebar, área de proteção) estão em `identidade_visual.md`, seção 8._
