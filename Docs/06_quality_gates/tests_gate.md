# Quality Gate — Tests

> Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Garantir que o comportamento esperado de um bloco está verificado, não apenas implementado.

## 2. Quando Aplicar

- Todo bloco que altera comportamento observável (funcionalidade, API, UI).
- Bloco que corrige um bug (deve incluir teste de regressão para o bug corrigido).

## 3. Checklist Obrigatório

- [ ] Testes unitários: lógica nova/alterada tem cobertura unitária correspondente.
- [ ] Testes de integração: fluxos que atravessam múltiplos componentes foram verificados de ponta a ponta.
- [ ] Testes manuais: caminhos que não têm automação foram verificados manualmente e o resultado está registrado.
- [ ] Regressão: funcionalidades existentes relacionadas à área alterada foram reverificadas (ver `10_tests/regressao.md` da sessão).
- [ ] Smoke test: após a mudança, o fluxo crítico mínimo do sistema continua funcionando.
- [ ] Critérios mínimos: todo critério de aceite do bloco tem teste ou verificação correspondente.

## 4. Critérios Mínimos de Aprovação

- Todo critério de aceite do bloco verificado (manual ou automatizado).
- Nenhum teste existente quebrado pela mudança.

## 5. Evidências Esperadas

- Saída de execução da suíte de testes automatizados.
- Registro dos casos de teste manuais executados e seus resultados (`10_tests/plano_testes.md`).

## 6. Riscos Verificados

- Cobertura insuficiente em área crítica.
- Teste que passa "no ambiente local" mas depende de estado não reproduzível em CI/produção.

## 7. Falhas Bloqueantes

- Teste automatizado existente quebrado pela mudança, sem correção.
- Critério de aceite sem nenhuma forma de verificação.

## 8. Ações Corretivas

- Adicionar o teste faltante antes de aprovar.
- Corrigir o teste quebrado ou justificar e registrar por que ele não se aplica mais.

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
