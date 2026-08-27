# Contrato de Deploy

> Projeto: HouseManager · Atualizado em: 2026-07-25

> Detalhe operacional de execução de deploy vai em `Docs/08_deploy/`. Aqui o foco é o contrato: o que cada lado (código, infraestrutura, pipeline) garante ao outro.

## 1. Objetivo

Definir o que precisa ser verdade para um deploy ser considerado seguro, e quem garante cada parte.

## 2. Responsabilidade

O que o pipeline de CI/CD garante (testes passaram, build é reprodutível) versus o que precisa ser verificado manualmente antes de promover para produção.

_..._

## 3. Ambientes

| Ambiente | Propósito | Quem pode promover deploy |
|---|---|---|
| Local | _..._ | _..._ |
| Homologação | _..._ | _..._ |
| Produção | _..._ | _..._ |

## 4. Inputs

O que o pipeline espera receber para iniciar um deploy (branch, tag, artefato de build, variáveis de ambiente já configuradas).

_..._

## 5. Outputs

O que constitui um deploy bem-sucedido (health check verde, smoke test passou, versão visível em endpoint de status).

_..._

## 6. Pipeline

Etapas do pipeline, em ordem, e o que cada uma valida.

1. _..._
2. _..._
3. _..._

## 7. Regras Obrigatórias

- [ ] Nenhum deploy em produção pula a etapa de testes automatizados.
- [ ] Toda promoção para produção tem plano de rollback verificado antes de iniciar.
- [ ] _..._

## 8. Erros Esperados

O que o pipeline faz quando uma etapa falha (build, teste, health check pós-deploy) — bloqueia automaticamente ou exige decisão manual?

_..._

## 9. Validações

Checklist mínimo antes de promover para produção (ver também `Docs/06_quality_gates/deploy_gate.md`).

_..._

## 10. Versionamento do Contrato

Como uma mudança no processo de deploy (nova etapa, novo ambiente) é comunicada à equipe/agentes antes de se tornar obrigatória.

_..._

## 11. Decisões Pendentes

_..._
