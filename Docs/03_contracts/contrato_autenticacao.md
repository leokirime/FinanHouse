# Contrato de Autenticação

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Mudanças neste contrato afetam segurança diretamente. Qualquer alteração aqui deve passar pelo `Docs/06_quality_gates/security_gate.md` antes de ir para produção.

## 1. Objetivo

Definir como identidade é estabelecida e verificada em todo o sistema, sem ambiguidade.

## 2. Responsabilidade

O que o serviço de autenticação garante (validade do token, expiração, revogação) versus o que cada serviço consumidor precisa verificar por conta própria.

_..._

## 3. Fluxo de Autenticação

Passo a passo do login até a obtenção de uma sessão/token válido (incluindo OAuth/SSO/MFA, se aplicável).

_..._

## 4. Tokens e Sessões

| Item | Valor |
|---|---|
| Tipo (JWT / sessão opaca / outro) | _..._ |
| Tempo de vida (access token) | _..._ |
| Tempo de vida (refresh token) | _..._ |
| Onde é armazenado no cliente | _..._ |
| Como é revogado | _..._ |

## 5. Inputs

Formato de credenciais aceitas no login (email/senha, social login, API key) e regras de validação antes de tentar autenticar.

_..._

## 6. Outputs

Formato da resposta de autenticação bem-sucedida (token, claims incluídos, dados do usuário retornados).

_..._

## 7. Regras Obrigatórias

- [ ] Senhas nunca são armazenadas em texto plano.
- [ ] Tokens expirados são rejeitados, não apenas avisados.
- [ ] Nenhum dado sensível (senha, token completo) aparece em log.
- [ ] _..._

## 8. Autorização

Como permissões/papéis são representados e verificados (RBAC, ABAC, escopos) — separado de autenticação (quem você é vs. o que você pode fazer).

_..._

## 9. Erros Esperados

| Cenário | Código | Comportamento esperado |
|---|---|---|
| Credenciais inválidas | _..._ | _..._ |
| Token expirado | _..._ | _..._ |
| Token revogado | _..._ | _..._ |
| Sem permissão (autorização) | _..._ | _..._ |

## 10. Validações

Checklist mínimo de segurança a verificar antes de qualquer mudança neste contrato ir para produção (ver também `Docs/06_quality_gates/security_gate.md`).

_..._

## 11. Versionamento do Contrato

Como uma mudança (ex.: troca de provedor de auth, mudança de formato de token) é migrada sem invalidar sessões ativas inesperadamente.

_..._

## 12. Decisões Pendentes

_..._
