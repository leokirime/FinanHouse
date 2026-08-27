# Checklist de Segurança

> Projeto: HouseManager-Rename · Atualizado em: 2026-08-27

> Aplica-se a qualquer sessão que toque autenticação, autorização, dados sensíveis ou entrada de usuário. Ver também `Docs/06_quality_gates/security_gate.md` para o gate formal antes do fechamento.

## 1. Itens de Verificação

- [ ] Nenhuma credencial, token ou segredo foi commitado no código ou em documentação.
- [ ] Toda entrada de usuário é validada antes de ser processada ou persistida.
- [ ] Autenticação e autorização foram verificadas em cada novo endpoint/rota introduzido.
- [ ] Nenhum dado sensível aparece em log (ver `Docs/09_observability/logs.md`).
- [ ] Dependências novas foram verificadas quanto a vulnerabilidades conhecidas.
- [ ] Mensagens de erro não expõem detalhes internos (stack trace, query SQL) a usuários finais.

## 2. Riscos Específicos Desta Sessão

_..._

## 3. Perguntas Orientadoras

- Se um usuário malicioso tivesse acesso direto a este endpoint/funcionalidade, o que ele conseguiria fazer?
- Esta mudança altera o contrato de autenticação (`Docs/03_contracts/contrato_autenticacao.md`)? Se sim, isso foi revisado?

## 4. Decisões Pendentes

_..._
