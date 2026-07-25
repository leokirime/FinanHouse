# Deploy Produção

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Nenhum deploy em produção é feito sem passar pelo `Docs/06_quality_gates/deploy_gate.md`. Em caso de dúvida sobre segurança do deploy, pare e confirme com o usuário antes de prosseguir.

## 1. Objetivo

Garantir que toda promoção para produção seja previsível, verificável e reversível.

## 2. Checklist Pré-Produção

- [ ] Testes automatizados passando na branch/tag a ser promovida.
- [ ] Migrações de banco (se houver) validadas em homologação.
- [ ] Variáveis de ambiente de produção conferidas (`Docs/03_contracts/contrato_variaveis_ambiente.md`).
- [ ] Plano de rollback revisado e pronto para execução imediata.
- [ ] Stakeholders relevantes avisados da janela de deploy (se aplicável).

## 3. Pré-requisitos

Quem tem permissão para promover para produção, aprovação necessária.

_..._

## 4. Passos

1. _..._
2. _..._
3. _..._

## 5. Como Verificar que Funcionou

Health check pós-deploy, smoke test mínimo, métricas a observar nos primeiros minutos.

_..._

## 6. Rollback

Como revertir rapidamente se algo der errado — comando/processo exato, não "depende".

_..._

## 7. Logs

Onde consultar logs de produção (ver também `Docs/09_observability/logs.md`).

_..._

## 8. Problemas Comuns

Ver `Docs/08_deploy/troubleshooting.md`.

## 9. Decisões Pendentes

_..._
