# Quality Gate — Deploy

> Projeto: HouseManager · Atualizado em: 2026-07-25

## 1. Objetivo

Garantir que toda promoção para homologação ou produção seja segura, verificável e reversível.

## 2. Quando Aplicar

- Antes de qualquer deploy em homologação ou produção (ver `Docs/08_deploy/`).
- Bloco altera pipeline de CI/CD, variáveis de ambiente de produção, ou processo de release.

## 3. Checklist Obrigatório

- [ ] Variáveis de ambiente: todas as variáveis exigidas estão configuradas no ambiente alvo (`Docs/03_contracts/contrato_variaveis_ambiente.md`).
- [ ] Build: o build foi gerado a partir da branch/commit correto e passou sem erros.
- [ ] Versionamento: a versão sendo promovida está identificada de forma rastreável (tag, hash de commit).
- [ ] Rollback: plano de rollback revisado e testável antes do deploy iniciar.
- [ ] Logs: acesso a logs do ambiente de destino confirmado antes do deploy.
- [ ] Health check: endpoint de health check responde corretamente após o deploy.
- [ ] Smoke test pós-deploy: fluxo crítico mínimo verificado no ambiente após a promoção.

## 4. Critérios Mínimos de Aprovação

- Nenhuma etapa do pipeline foi pulada manualmente.
- Plano de rollback existe e foi revisado por quem está fazendo o deploy.

## 5. Evidências Esperadas

- Resultado do health check e smoke test pós-deploy.
- Link/ID do pipeline de CI/CD executado.

## 6. Riscos Verificados

- Variável de ambiente ausente ou incorreta no ambiente de destino.
- Migração de banco não testada em homologação antes de produção.

## 7. Falhas Bloqueantes

- Health check falhando após o deploy.
- Rollback não testável ou inexistente para uma mudança de risco alto.

## 8. Ações Corretivas

- Executar rollback imediatamente se o smoke test pós-deploy falhar.
- Corrigir variável de ambiente e reexecutar o deploy.

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
