# Convenções de Commits

> Projeto: HouseManager · Atualizado em: 2026-07-25

> Toda sugestão de commit semântico em feedbacks e prompts da DDAE Engine segue este padrão. Nenhum commit é feito sem confirmação explícita do usuário — ver `Docs/00_ddae_engine/regras_ddae_engine.md`, regra 6.

## 1. Objetivo

Tornar o histórico do git legível e pesquisável — cada commit explica o "porquê", não apenas o "o quê" (isso já está no diff).

## 2. Formato

```
<tipo>(<escopo opcional>): <descrição curta no imperativo>

<corpo opcional explicando o porquê>
```

## 3. Tipos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade visível ao usuário ou consumidor da API. |
| `fix` | Correção de bug. |
| `docs` | Mudança apenas em documentação. |
| `refactor` | Mudança de estrutura interna sem alterar comportamento observável. |
| `test` | Adição ou ajuste de testes, sem mudança de código de produção. |
| `chore` | Tarefas de manutenção (dependências, configuração) sem impacto em comportamento. |
| `perf` | Mudança focada em melhorar performance. |

## 4. Regras Obrigatórias

- [ ] Descrição no imperativo presente ("adiciona", não "adicionado" ou "adicionando").
- [ ] Um commit representa uma unidade lógica de mudança, não múltiplas tarefas não relacionadas.
- [ ] Commits sugeridos por agentes de IA são sempre confirmados pelo usuário antes de serem executados.

## 5. Exemplos

```
feat(auth): adiciona fluxo de recuperação de senha por email
fix(checkout): corrige cálculo de frete para pedidos internacionais
docs(architecture): documenta decisão de troca de banco de dados
```

## 6. Perguntas Orientadoras

- Alguém lendo só a primeira linha deste commit entenderia o impacto da mudança?
- Este commit deveria ser dois commits separados (mudanças não relacionadas)?

## 7. Decisões Pendentes

_..._
