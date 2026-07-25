# Tokens de Design

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Tokens são a fonte única da verdade para valores visuais. Se um valor não está aqui como token, ele não deveria estar hardcoded em um componente.

## 1. Objetivo

Centralizar todo valor visual reutilizável (cor, espaçamento, tipografia, raio, sombra) em tokens nomeados, para que mudar um valor não exija caçar ocorrências no código.

## 2. Cores

| Token | Valor | Variável no código |
|---|---|---|
| `color-primary` | _..._ | _..._ |
| `color-secondary` | _..._ | _..._ |
| `color-success` | _..._ | _..._ |
| `color-error` | _..._ | _..._ |
| `color-warning` | _..._ | _..._ |
| `color-text` | _..._ | _..._ |
| `color-background` | _..._ | _..._ |

## 3. Espaçamento

Escala de espaçamento usada (ex.: base 4px/8px) e os tokens derivados.

| Token | Valor |
|---|---|
| `space-xs` | _..._ |
| `space-sm` | _..._ |
| `space-md` | _..._ |
| `space-lg` | _..._ |
| `space-xl` | _..._ |

## 4. Tipografia

| Token | Família | Tamanho | Peso | Altura de linha |
|---|---|---|---|---|
| `text-heading-1` | _..._ | _..._ | _..._ | _..._ |
| `text-body` | _..._ | _..._ | _..._ | _..._ |
| `text-caption` | _..._ | _..._ | _..._ | _..._ |

## 5. Raio e Sombra

| Token | Valor |
|---|---|
| `radius-sm` | _..._ |
| `radius-md` | _..._ |
| `shadow-sm` | _..._ |
| `shadow-md` | _..._ |

## 6. Regras Obrigatórias

- [ ] Todo valor visual usado mais de uma vez no código tem um token correspondente aqui.
- [ ] Nenhum componente usa valor de cor/espaçamento hardcoded quando um token equivalente já existe.
- [ ] _..._

## 7. Perguntas Orientadoras

- Este token está implementado no código (variável CSS, tema, objeto de design tokens) exatamente como documentado aqui?

## 8. Decisões Pendentes

_..._
