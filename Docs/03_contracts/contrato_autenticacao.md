# Contrato de Autenticação

> Projeto: FinanHouse · Atualizado em: 2026-08-04

> Mudanças neste contrato afetam segurança diretamente. Qualquer alteração aqui deve passar pelo `Docs/06_quality_gates/security_gate.md` antes de ir para produção.

> Implementado no Bloco 19 (DT-14, `Docs/02_architecture/decisoes_tecnicas.md`). **Sem cadastro público** — só os usuários já vinculados ao household (bootstrap do Bloco 17) podem autenticar. Nenhuma rota cria usuário novo.

## 1. Objetivo

Definir como identidade é estabelecida e verificada em todo o sistema, sem ambiguidade: login por e-mail/senha, sessão real por cookie `HttpOnly`, e proteção de toda rota financeira.

## 2. Responsabilidade

O serviço de autenticação (`apps/api/src/application/services/auth-services.ts`) garante: verificação de senha (Argon2id), criação/validação/revogação de sessão, expiração e vínculo ativo com o household. Cada rota financeira (`apps/api/src/http/plugins/auth.ts`, `preHandler` global) verifica, além disso, que o `householdId` da URL corresponde ao da sessão — nunca confia apenas na existência de uma sessão válida para qualquer household.

## 3. Fluxo de Autenticação

1. Cliente envia `POST /api/v1/auth/login` com `{ email, password }`.
2. Backend localiza o usuário pelo e-mail, verifica a senha via Argon2id (`verifyPassword`) contra `users.password_hash`.
3. Se a senha confere, o usuário está `active`, e existe um vínculo `active` desse usuário com algum household (`household_members`), uma sessão é criada: token opaco de 256 bits gerado por `crypto.randomBytes`, salvo como hash SHA-256 em `auth_sessions.token_hash`.
4. O token bruto é devolvido ao cliente exclusivamente via cookie `Set-Cookie: finanhouse_session=...; HttpOnly; SameSite=Lax; Secure (fora de development); Path=/`. Nunca aparece no corpo da resposta.
5. Requisições seguintes enviam o cookie automaticamente (`fetch(..., { credentials: 'include' })` no cliente); o backend calcula o hash do token recebido e busca em `auth_sessions` — nunca compara o token bruto diretamente.
6. `POST /api/v1/auth/logout` marca `revoked_at` na sessão e limpa o cookie — idempotente (chamar sem sessão ou já revogada não lança).

Não há OAuth, SSO, MFA ou refresh token separado — fora de escopo (ver seção 12).

## 4. Tokens e Sessões

| Item | Valor |
|---|---|
| Tipo (JWT / sessão opaca / outro) | Sessão opaca — token aleatório de 256 bits (`crypto.randomBytes`), nunca JWT |
| Tempo de vida | 7 dias (`SESSION_TTL_MS`, `auth-services.ts`) — sem "lembrar de mim" separado |
| Refresh token | Não existe — sessão única, expira e exige novo login |
| Onde é armazenado no cliente | Cookie `HttpOnly` (`finanhouse_session`) — nunca acessível a JavaScript, nunca `localStorage`/`sessionStorage` |
| Como é revogado | `POST /api/v1/auth/logout` (usuário) ou expiração natural (`expires_at`); não há revogação em massa/por admin nesta fase |
| O que o banco armazena | Só o hash SHA-256 do token (`auth_sessions.token_hash`, único) — nunca o token bruto |

## 5. Inputs

`POST /api/v1/auth/login` — corpo `{ email: string, password: string }`, `additionalProperties: false`. `email`/`password` não têm validação de formato além de tamanho (1–255 caracteres) — a validação real é "existe e a senha confere", nunca revelada em separado (ver seção 9).

## 6. Outputs

Login e `GET /api/v1/auth/session` bem-sucedidos devolvem:

```json
{ "data": { "user": { "id": 1, "displayName": "Nome", "email": "email@exemplo.invalid" }, "householdId": 10 } }
```

Nunca inclui `passwordHash`, token bruto, ou qualquer campo interno. `POST /api/v1/auth/logout` devolve 204 sem corpo.

## 7. Regras Obrigatórias

- [x] Senhas nunca são armazenadas em texto plano — sempre hash Argon2id (`@node-rs/argon2`).
- [x] Tokens expirados são rejeitados, não apenas avisados — `ValidateSessionService` compara `expires_at` a cada requisição.
- [x] Nenhum dado sensível (senha, token completo) aparece em log — scripts de banco nunca imprimem e-mail/senha/hash, apenas contagens e flags booleanas.
- [x] Token bruto nunca trafega fora do cookie `HttpOnly` (nunca no corpo JSON, nunca em query string).
- [x] `createdByUserId`/`closedByUserId` das rotas financeiras vêm exclusivamente da sessão (`request.authSession.userId`) — nunca do corpo da requisição.

## 8. Autorização

Não há RBAC/ABAC granular nesta fase — `household_members.role` (`owner`/`member`) existe no schema, mas nenhuma rota diferencia permissões por papel ainda. A única autorização real é "a sessão pertence a um membro ativo do household da URL" (`householdId` da sessão === `householdId` da URL); qualquer outro household é indistinguível de inexistente (404).

## 9. Erros Esperados

| Cenário | Código | Comportamento esperado |
|---|---|---|
| Credenciais inválidas (e-mail não existe, senha errada, conta inativa, sem vínculo ativo com nenhum household) | 401 `UNAUTHENTICATED` | Mensagem sempre genérica ("E-mail ou senha inválidos.") — nunca distingue qual dos quatro casos |
| Sessão ausente/expirada/revogada em rota protegida | 401 `UNAUTHENTICATED` | Mensagem genérica ("Sessão ausente."/"Sessão expirada ou revogada.") |
| `householdId` da URL diferente do da sessão | 404 `NOT_FOUND` | Nunca 401/403 — indistinguível de um household inexistente |
| Muitas tentativas de login (10 em 5 minutos, mesmo IP) | 429 `RATE_LIMITED` | `@fastify/rate-limit`, mensagem própria da lib (segura de expor) |

## 10. Validações

- [x] `password_hash` nunca aparece em nenhum DTO de resposta (verificado em `UserRepository`/mapeadores).
- [x] Cookie de sessão sempre `HttpOnly` (`sessionCookieOptions`, `apps/api/src/http/plugins/auth.ts`).
- [x] `Secure` ativo fora de `development` (nunca em produção sobre HTTP puro).
- [x] CORS restrito à mesma lista fechada de origens locais de sempre (nunca wildcard, mesmo com `Access-Control-Allow-Credentials: true`).
- [x] Testes cobrindo: hash/verificação de senha, geração/hash de token, criação/validação/expiração/revogação de sessão, rotas HTTP de login/session/logout, proteção de rota financeira sem sessão (401) e com household divergente (404), `createdByUserId` derivado da sessão (nunca forjável pelo corpo).

## 11. Versionamento do Contrato

Enquanto não houver múltiplos clientes reais, mudanças de contrato (ex.: trocar cookie por outro mecanismo) não exigem depreciação formal — apenas atualizar este documento e `apps/web/src/api/auth-api.ts` na mesma alteração. Trocar o algoritmo de hash de senha (ex.: parâmetros do Argon2id) exigiria uma estratégia de migração incremental de hashes existentes — não implementada, pois este é o primeiro algoritmo usado.

## 12. Decisões Pendentes

- Cadastro público — deliberadamente fora de escopo; sistema é doméstico, não SaaS (ver DT-14).
- Recuperação de senha (esqueci minha senha) — não implementada; troca de senha hoje depende de um novo `db-configure-initial-passwords.ts` com `CONFIRM_PASSWORD_OVERWRITE=true`.
- MFA — não implementado.
- OAuth/SSO — não implementado.
- Permissões granulares por papel (`owner` vs `member`) — schema existe, nenhuma rota diferencia ainda.
- Limpeza periódica de sessões expiradas (`auth_sessions` cresce indefinidamente, nunca purgada automaticamente) — dívida técnica registrada, sem job agendado nesta fase.
- Deploy seguro/produção — fora de escopo; API continua estritamente local (bind `127.0.0.1`, CORS fechado, `createHttpApp` recusa `runtimeMode: 'production'`).
