# Quality Gate — Performance

> Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Garantir que a mudança não degrade tempo de resposta, uso de recursos ou experiência percebida sem que isso seja uma decisão consciente.

## 2. Quando Aplicar

- Bloco adiciona ou altera consultas a banco de dados.
- Bloco adiciona processamento pesado (loops grandes, transformação de dados volumosa).
- Bloco altera frontend de forma que pode afetar tamanho de bundle ou tempo de carregamento.
- Bloco adiciona chamada a serviço externo no caminho crítico de uma requisição.

## 3. Checklist Obrigatório

- [ ] Build: o tempo de build não aumentou de forma desproporcional à mudança.
- [ ] Carregamento: tempo de carregamento inicial (se frontend) foi medido antes/depois.
- [ ] Resposta da API: tempo de resposta de endpoints alterados foi medido, não assumido.
- [ ] Consultas: novas consultas ao banco usam índice adequado; nenhum N+1 foi introduzido.
- [ ] Bundle: tamanho de bundle (se aplicável) foi verificado após a mudança.
- [ ] Uso de memória: nenhum vazamento de memória ou crescimento não controlado foi introduzido.
- [ ] Gargalos: nenhum novo ponto de contenção foi introduzido sem mitigação ou registro como risco aceito.

## 4. Critérios Mínimos de Aprovação

- Nenhum limiar definido em `Docs/01_product/requisitos_nao_funcionais.md` foi violado.
- Toda regressão de performance identificada está documentada e foi uma decisão consciente, não um efeito colateral não percebido.

## 5. Evidências Esperadas

- Métricas antes/depois (`12_performance/checklist_performance.md` da sessão).
- Resultado de profiling ou ferramenta de medição usada.

## 6. Riscos Verificados

- Consulta sem índice em tabela que cresce com o tempo.
- Processamento síncrono que deveria ser assíncrono.

## 7. Falhas Bloqueantes

- Regressão de performance mensurável em fluxo crítico, sem mitigação ou justificativa.

## 8. Ações Corretivas

- Adicionar índice, cache ou processamento assíncrono conforme o gargalo identificado.
- Se a regressão for aceita conscientemente, registrar em `Docs/04_governance/matriz_riscos.md`.

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
