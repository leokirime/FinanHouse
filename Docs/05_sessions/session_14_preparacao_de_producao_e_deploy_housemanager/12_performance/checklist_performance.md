# Checklist de Performance

> Projeto: HouseManager-Rename · Atualizado em: 2026-08-28

> Ver também `Docs/06_quality_gates/performance_gate.md` para o gate formal antes do fechamento.

## 1. Itens de Verificação

- [ ] Consultas novas ao banco foram revisadas quanto a uso de índice (sem full scan em tabela grande).
- [ ] Nenhuma chamada de rede ou consulta é feita dentro de um loop sem necessidade (N+1).
- [ ] Tamanho de bundle/pacote foi verificado, se a mudança afeta o frontend.
- [ ] Tempo de resposta de endpoints novos/alterados foi medido, não apenas assumido como aceitável.
- [ ] Operações pesadas (relatórios, exportação) rodam de forma assíncrona quando aplicável.

## 2. Métricas Observadas

| Métrica | Antes | Depois |
|---|---|---|
| _..._ | _..._ | _..._ |

## 3. Perguntas Orientadoras

- Esta mudança foi testada com volume de dados realista, ou só com dataset de desenvolvimento pequeno?
- Existe algum limiar de performance definido em `Docs/01_product/requisitos_nao_funcionais.md` que esta sessão precisa respeitar?

## 4. Decisões Pendentes

_..._
