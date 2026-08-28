# Acessibilidade

> Projeto: HouseManager · Atualizado em: 2026-07-25

> Acessibilidade é requisito, não melhoria opcional. Ver também `Docs/01_product/requisitos_nao_funcionais.md`, seção 5.

## 1. Objetivo

Garantir que o produto seja usável por pessoas com diferentes capacidades visuais, motoras, auditivas e cognitivas.

## 2. Padrão Adotado

Alvo: WCAG 2.1 AA nos pontos aplicáveis a este bloco (contraste, navegação por teclado, foco visível, semântica). Escolhido por ser o padrão de mercado mais amplamente cobrado e testável sem ferramentas especializadas.

## 3. Diretrizes — o que foi implementado no Bloco 06

- **Landmarks semânticos**: `<aside>` (Sidebar), `<header>` (DashboardHeader), `<main id="main-content">` (conteúdo), `<nav aria-label="Áreas do Finanhouse">`.
- **Navegação ativa**: item "Visão geral" com `aria-current="page"`; demais itens com `aria-disabled="true"` (sem `href` fictício, sem simular navegação para página inexistente).
- **Foco visível**: `:focus-visible` global (`global.css`) com contorno roxo consistente, sem depender de estilo de navegador.
- **Não depender só de cor**: status de movimentação/competência sempre acompanhado de texto (badge com label, não apenas cor de fundo); indicadores de receita/despesa têm ícone (`↑`/`↓`) além da cor.
- **Gráfico com alternativa textual**: `FinancialEvolutionChart` tem o SVG marcado `aria-hidden="true"` e um parágrafo `.fh-visually-hidden` com o resumo completo dos valores por competência, para leitores de tela.
- **`prefers-reduced-motion`**: respeitado globalmente (`global.css` reduz duração de transições/animações a ~0 quando o usuário solicita).
- **Elementos interativos são `<button>`**, nunca `<div>` clicável — inclusive itens de navegação "indisponíveis" e CTAs "apenas visuais".
- **Tabelas**: cabeçalhos com `<th scope="col">` (`RecentEntries`).

## 4. Checklist

- [x] Navegação completa por teclado — todos os controles são `<button>` nativos, focáveis via Tab.
- [ ] Contraste de cores verificado com ferramenta dedicada — verificado visualmente durante o desenvolvimento (paleta escura com texto claro de alto contraste), mas **não medido numericamente** (ex.: com um verificador de contraste automatizado); pendência registrada abaixo.
- [x] Atributos ARIA usados onde a semântica HTML nativa não bastava (`aria-current`, `aria-disabled`, `aria-labelledby`, `aria-hidden`).
- [ ] Testado com leitor de tela real — não realizado neste bloco (protótipo); a alternativa textual do gráfico e os labels foram escritos para funcionar com leitores de tela, mas sem teste manual com um.
- [x] Tamanho de área clicável adequado — botões da sidebar/header usam padding generoso (`--fh-space-3`/`--fh-space-2` mínimo).

## 5. Regras Obrigatórias

- [x] Nenhum componente novo é considerado concluído sem passar pelo checklist acima (itens não concluídos foram registrados explicitamente como pendência, não omitidos).

## 6. Perguntas Orientadoras

- Este fluxo crítico (login, checkout, etc.) funciona de ponta a ponta sem usar o mouse? — Não aplicável neste bloco (sem formulários/fluxos de escrita).
- Existe algum elemento que depende só de cor para transmitir informação? — Não: status e tipo (receita/despesa) sempre têm texto/ícone além da cor.

## 7. Decisões Pendentes

- P3 — Verificar contraste numericamente (ex.: ferramenta de contraste WCAG) antes do checkpoint visual do proprietário.
- P3 — Testar os fluxos de leitura do dashboard com um leitor de tela real (NVDA/VoiceOver) antes de considerar a acessibilidade "validada" além do nível estrutural.
