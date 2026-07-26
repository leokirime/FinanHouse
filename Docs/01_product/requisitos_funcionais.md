# Requisitos Funcionais

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Todo bloco de implementação deve referenciar um requisito listado aqui. Se uma tarefa não tem requisito correspondente, atualize esta lista antes de implementar — não implemente "por inferência".

## 1. Lista de Requisitos

Numere os requisitos para que possam ser referenciados por blocos e prompts (ex.: `RF-01`).

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF-01 | Registrar movimentações financeiras (receitas/despesas) com ciclo de vida previsto → pendente → realizado, ou cancelado | Must | Concluído (regras de domínio, Bloco 05) |
| RF-02 | Organizar movimentações por competência mensal, com abertura/revisão/fechamento | Must | Concluído (regras de domínio, Bloco 05) |
| RF-03 | Calcular indicadores financeiros por competência (previsto, realizado, pendente, saldo) | Must | Concluído (regras de domínio, Bloco 05) |
| RF-04 | Comparar duas competências mensais (variações de receita/despesa/saldo, categorias) | Should | Concluído (regras de domínio, Bloco 05) |
| RF-05 | Persistir movimentações e competências em banco real (MySQL) | Must | Pendente (bloqueado por TLS — Bloco 04) |
| RF-06 | Interface visual para consultar/editar movimentações e competências | Must | Em andamento — dashboard de visão geral concluído (Bloco 06, com refinamento visual pendente); Movimentações funcional com estado em memória concluído (Bloco 07); persistência real segue bloqueada (RF-05) |

Detalhamento técnico completo das regras (transições de status, cálculos, estratégia monetária): `Docs/02_architecture/regras_dominio_financeiro.md`.

## 2. Critérios de Aceite

Para cada requisito, descreva como verificar que ele foi atendido (comportamento observável, não implementação).

### RF-01 — Movimentações financeiras
- [x] Uma movimentação pode ser criada, marcada como pendente, realizada ou cancelada, seguindo as transições documentadas.
- [x] Uma movimentação `realized` sempre tem valor e data de realização; nenhuma outra tem.
- [x] Um usuário consegue realizar essas ações pela interface visual — página "Movimentações" (Bloco 07), sobre estado em memória (`Docs/02_architecture/estado_temporario_frontend.md`); persistência real ainda depende de RF-05.

### RF-02 — Competência mensal
- [x] Uma competência pode ser aberta, colocada em revisão, fechada e reaberta, seguindo as transições documentadas.
- [x] Uma competência fechada não aceita novas movimentações nem alterações comuns.
- [ ] Um usuário consegue gerenciar (abrir/revisar/fechar) competências pela interface visual — ainda não implementado; Bloco 07 cobriu apenas as movimentações dentro da competência atual, já aberta.

## 3. Perguntas Orientadoras

- Este requisito está descrito em termos de comportamento (o que o sistema faz), não de implementação (como ele faz)?
- Existe um critério de aceite que um avaliador externo conseguiria checar sem ler o código?
- Este requisito depende de algum outro ainda não atendido?

## 4. Riscos

Requisitos ambíguos, conflitantes ou que dependem de decisões de produto ainda não tomadas.

_..._

## 5. Decisões Pendentes

_..._
