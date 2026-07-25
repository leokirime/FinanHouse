# Componentes de UI

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Antes de criar um componente novo, verifique aqui se um equivalente já existe. Duplicar componentes com variações pequenas é a forma mais comum de o design system degradar.

## 1. Objetivo

Inventariar os componentes de UI reutilizáveis disponíveis, para evitar duplicação e inconsistência visual.

## 2. Inventário de Componentes

| Componente | Onde vive no código | Variantes | Estados suportados |
|---|---|---|---|
| Botão | _..._ | Primário / Secundário / Destrutivo | Default / Hover / Disabled / Loading |
| Input de texto | _..._ | _..._ | Default / Foco / Erro / Disabled |
| _..._ | _..._ | _..._ | _..._ |

## 3. Estados Visuais Obrigatórios

Todo componente interativo deve ter comportamento visual definido para:

- [ ] Default
- [ ] Hover / Focus
- [ ] Active / Pressed
- [ ] Disabled
- [ ] Loading (quando aplicável)
- [ ] Erro / Validação (quando aplicável)
- [ ] Vazio (empty state, quando aplicável a listas/dados)

## 4. Regras Obrigatórias

- [ ] Antes de criar um componente novo, verificar se um existente (com prop/variante adicional) resolve o mesmo caso.
- [ ] Todo componente novo é adicionado a este inventário no mesmo bloco em que é criado.
- [ ] _..._

## 5. Perguntas Orientadoras

- Este componente novo é genuinamente diferente de um já existente, ou é uma variação que deveria ser uma prop?
- Este componente cobre todos os estados visuais obrigatórios listados acima?

## 6. Decisões Pendentes

_..._
