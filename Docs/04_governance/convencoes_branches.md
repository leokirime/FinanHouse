# Convenções de Branches

> Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Garantir que o nome de uma branch já comunique o que ela contém, sem precisar abrir o PR.

## 2. Nomenclatura

```
<tipo>/<descricao-curta-em-kebab-case>
```

| Tipo | Exemplo |
|---|---|
| `feature/` | `feature/checkout-internacional` |
| `fix/` | `fix/calculo-frete` |
| `docs/` | `docs/contrato-autenticacao` |
| `chore/` | `chore/atualiza-dependencias` |

## 3. Fluxo

Branch principal (`main`/`master`), branches de feature de curta duração, estratégia de merge (squash, merge commit, rebase).

_..._

## 4. Regras Obrigatórias

- [ ] Nenhuma mudança vai direto para a branch principal sem revisão, salvo decisão explícita documentada aqui.
- [ ] Branches de feature são de curta duração — evite branches que vivem semanas sem merge.
- [ ] Push para a branch principal e force-push exigem confirmação explícita do usuário, mesmo quando sugeridos por um agente de IA.

## 5. Perguntas Orientadoras

- Uma branch aberta há muito tempo geralmente significa escopo grande demais — ela deveria ser dividida?
- Existe uma branch de longa duração (ex.: `develop`) ou o fluxo é trunk-based?

## 6. Decisões Pendentes

_..._
