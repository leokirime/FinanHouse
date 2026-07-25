# Quality Gate — Final Audit

> Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Verificar, ao final de uma sessão (ou do projeto), que toda a metodologia DDAE Engine foi seguida de ponta a ponta — não apenas que o código funciona.

## 2. Quando Aplicar

- Ao final de cada sessão, antes de marcar `09_validation/fechamento_sessao.md` como aprovado.
- Antes de uma release maior ou entrega para o cliente/stakeholder.

## 3. Checklist Obrigatório

- [ ] Escopo: todo bloco planejado foi executado ou explicitamente cancelado com justificativa.
- [ ] Feedbacks: todo bloco concluído tem feedback preenchido (`08_feedbacks/`).
- [ ] Validações: todo bloco concluído tem validação preenchida com status final.
- [ ] Pendências: nenhuma pendência P1 está aberta; pendências P2 abertas têm justificativa registrada.
- [ ] Documentação: documentos afetados (`Docs/01_product/`, `Docs/02_architecture/`, contratos, design system) estão atualizados.
- [ ] Commit: histórico de commits reflete o trabalho realizado, sem commits pendentes de confirmação esquecidos.
- [ ] Release: changelog e release notes (`13_release/`) preenchidos, se a sessão gera entrega visível.
- [ ] Riscos restantes: riscos não resolvidos foram promovidos para `Docs/04_governance/matriz_riscos.md`.
- [ ] `ddae-engine validate` e `ddae-engine audit` executados sem apontar problema não tratado.

## 4. Critérios Mínimos de Aprovação

- Nenhuma pendência P1 aberta em qualquer bloco da sessão.
- `ddae-engine audit` não reporta bloco sem prompt ou sem feedback correspondente.

## 5. Evidências Esperadas

- Saída de `ddae-engine validate` e `ddae-engine audit`.
- Lista de blocos da sessão com status de feedback/validação de cada um.

## 6. Riscos Verificados

- Bloco "fantasma" (sem feedback ou validação) não detectado antes do fechamento.
- Documentação que ficou desatualizada em relação ao comportamento real implementado.

## 7. Falhas Bloqueantes

- Pendência P1 aberta em qualquer bloco da sessão.
- Bloco concluído sem feedback ou sem validação.

## 8. Ações Corretivas

- Resolver a pendência P1 ou bloquear formalmente a sessão até que seja resolvida.
- Gerar e preencher o feedback/validação faltante antes de reexecutar a auditoria.

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
