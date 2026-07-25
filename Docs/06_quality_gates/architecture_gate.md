# Quality Gate — Architecture

> Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Garantir que mudanças não comprometam a consistência arquitetural, a separação de responsabilidades e a manutenibilidade do sistema descritas em `Docs/02_architecture/`.

## 2. Quando Aplicar

- Bloco introduz, remove ou altera um componente arquitetural (ver `Docs/02_architecture/arquitetura_base.md`).
- Bloco altera um contrato técnico (`Docs/03_contracts/`).
- Bloco adiciona uma dependência nova ou troca uma existente.
- Bloco altera a estrutura de pastas do projeto (`Docs/02_architecture/estrutura_projeto.md`).

## 3. Checklist Obrigatório

- [ ] Consistência arquitetural: a mudança segue os padrões já estabelecidos em `arquitetura_base.md`, ou justifica explicitamente o desvio.
- [ ] Separação de responsabilidades: cada componente afetado mantém responsabilidade única e clara.
- [ ] Contratos técnicos: nenhum contrato em `Docs/03_contracts/` foi quebrado sem versionamento/comunicação.
- [ ] Dependências: toda dependência nova está registrada em `Docs/04_governance/registro_decisoes.md` com alternativas consideradas.
- [ ] Escalabilidade: a mudança não introduz um novo ponto único de falha ou gargalo óbvio sem mitigação.
- [ ] Manutenibilidade: a mudança não aumenta acoplamento entre componentes que deveriam ser independentes.

## 4. Critérios Mínimos de Aprovação

- Nenhuma quebra de contrato técnico não comunicada.
- Nenhuma dependência nova sem decisão registrada.
- Nenhum componente com responsabilidade ambígua introduzido.

## 5. Evidências Esperadas

- Diff ou descrição das mudanças estruturais.
- Referência à entrada correspondente em `decisoes_tecnicas.md` ou `registro_decisoes.md`, se aplicável.

## 6. Riscos Verificados

- Acoplamento excessivo entre componentes.
- Ponto único de falha introduzido sem mitigação.
- Dependência crítica sem alternativa conhecida.

## 7. Falhas Bloqueantes

- Quebra de contrato técnico sem versionamento.
- Decisão arquitetural relevante tomada sem registro.

## 8. Ações Corretivas

- Reverter ou versionar a mudança de contrato quebrada.
- Registrar a decisão técnica retroativamente, com justificativa, antes de aprovar.

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
