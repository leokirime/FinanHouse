# Quality Gate — Design

> Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Garantir que mudanças de UI respeitem a identidade visual e o design system, e que a experiência seja acessível e responsiva.

## 2. Quando Aplicar

- Bloco introduz ou altera componente de UI.
- Bloco altera layout, cores, tipografia ou espaçamento de uma tela existente.

## 3. Checklist Obrigatório

- [ ] Identidade visual: cores, tipografia e logo seguem `Docs/07_design_system/identidade_visual.md`.
- [ ] Responsividade: a tela/componente foi verificada em pelo menos um breakpoint mobile e um desktop (`Docs/07_design_system/responsividade.md`).
- [ ] Acessibilidade: navegação por teclado, contraste e atributos ARIA verificados conforme `Docs/07_design_system/acessibilidade.md`.
- [ ] Componentes: nenhum componente foi duplicado quando um equivalente já existia em `Docs/07_design_system/componentes_ui.md`.
- [ ] Consistência: o componente/tela novo é visualmente coerente com o restante do produto.
- [ ] Estados visuais: todos os estados obrigatórios (default, hover, focus, disabled, loading, erro, vazio) foram implementados quando aplicável.

## 4. Critérios Mínimos de Aprovação

- Nenhum valor visual hardcoded fora dos tokens definidos em `tokens_design.md`.
- Nenhuma falha de contraste ou navegação por teclado em fluxo crítico.

## 5. Evidências Esperadas

- Print ou gravação da tela/componente nos breakpoints testados.
- Resultado da verificação de acessibilidade (manual ou ferramenta).

## 6. Riscos Verificados

- Inconsistência visual com telas existentes.
- Elemento interativo inacessível por teclado ou leitor de tela.

## 7. Falhas Bloqueantes

- Fluxo crítico inacessível por teclado.
- Quebra visual em breakpoint mobile ou desktop padrão.

## 8. Ações Corretivas

- Ajustar o componente para usar os tokens corretos.
- Adicionar suporte a teclado/ARIA faltante antes de aprovar.

## 9. Status

- [ ] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado
- [ ] Bloqueado

## 10. Responsável pela Validação

_Quem executou esta validação — pessoa humana ou agente de IA, e sob supervisão de quem._

**Responsável:** A definir

## 11. Data da Validação

**Data:** A definir

## 12. Observações

_Contexto adicional relevante para quem ler este gate depois: exceções aceitas, ressalvas, links para evidências externas. Se nenhuma, escreva "Nenhuma observação adicional"._

**Observações:** A definir
