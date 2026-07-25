# Acessibilidade

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Acessibilidade é requisito, não melhoria opcional. Ver também `Docs/01_product/requisitos_nao_funcionais.md`, seção 5.

## 1. Objetivo

Garantir que o produto seja usável por pessoas com diferentes capacidades visuais, motoras, auditivas e cognitivas.

## 2. Padrão Adotado

Nível de conformidade alvo (ex.: WCAG 2.1 AA) e por que esse nível foi escolhido.

_..._

## 3. Diretrizes

- Contraste mínimo de texto contra fundo (ex.: 4.5:1 para texto normal).
- Todo elemento interativo é navegável e operável por teclado.
- Todo elemento interativo tem foco visível.
- Imagens informativas têm texto alternativo; imagens decorativas são marcadas como tal.
- Formulários têm labels associados corretamente aos campos, não apenas placeholder.
- Mensagens de erro são anunciadas para leitores de tela, não apenas exibidas visualmente.

## 4. Checklist

- [ ] Navegação completa por teclado testada (Tab, Shift+Tab, Enter, Esc).
- [ ] Contraste de cores verificado para texto e elementos de UI relevantes.
- [ ] Atributos ARIA usados corretamente onde semântica HTML nativa não é suficiente.
- [ ] Testado com pelo menos um leitor de tela (ou ferramenta de simulação) nos fluxos críticos.
- [ ] Tamanho de área clicável/tocável adequado em mobile (mínimo recomendado ~44x44px).

## 5. Regras Obrigatórias

- [ ] Nenhum componente novo é considerado concluído sem passar pelo checklist acima.
- [ ] _..._

## 6. Perguntas Orientadoras

- Este fluxo crítico (login, checkout, etc.) funciona de ponta a ponta sem usar o mouse?
- Existe algum elemento que depende só de cor para transmitir informação (ex.: erro só em vermelho, sem ícone/texto)?

## 7. Decisões Pendentes

_..._
