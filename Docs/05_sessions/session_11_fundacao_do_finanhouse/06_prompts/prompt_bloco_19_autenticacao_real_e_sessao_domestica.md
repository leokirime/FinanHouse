# Prompt — Bloco 19: Autenticação real e sessão doméstica

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_19_autenticacao_real_e_sessao_domestica.md`
- `Docs/03_contracts/contrato_autenticacao.md`, `contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md` e `Docs/02_architecture/decisoes_tecnicas.md` (DT-09, DT-10, DT-12, DT-13)

## 2. Objetivo

Implementar autenticação real (login por e-mail/senha, sessão por cookie `HttpOnly`, logout) para os dois usuários já existentes no household, protegendo todas as rotas financeiras — sem cadastro público.

## 3. Escopo

`users.password_hash`/`password_configured_at` + tabela `auth_sessions` + migration `0003` (gerada, revisada, não aplicada); hash Argon2id + token/hash de sessão SHA-256; repositórios/serviços de autenticação; endpoints `.../auth/{login,session,logout}`; guard global de sessão em toda rota financeira; `createdByUserId`/`closedByUserId` derivados da sessão; script de configuração de senhas iniciais e script de auditoria dedicados; `AuthProvider`/`LoginPage`/`AppRoot` reais no frontend, sem `VITE_FINANHOUSE_HOUSEHOLD_ID`.

## 4. Fora de Escopo

Cadastro público; recuperação de senha; MFA; OAuth/SSO; permissões granulares por papel; limpeza periódica de sessões expiradas; aplicação da migration/configuração de senhas sem autorização explícita.

## 5. Arquivos Permitidos

- `apps/api/src/db/schema/users.ts`, `auth-sessions.ts`, `schema/index.ts`, `db/types.ts`
- `database/migrations/0003_auth_sessions.sql`, `meta/_journal.json`, `meta/0003_snapshot.json`
- `apps/api/src/security/**`, `apps/api/src/application/auth-errors.ts`, `application/ports/auth-session-repository.ts`, `user-repository.ts`, `household-member-repository.ts`, `ports/index.ts`
- `apps/api/src/application/services/auth-services.ts`, `services/index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-auth-session-repository.ts`, `drizzle-user-repository.ts`, `drizzle-household-member-repository.ts`, `mappers/auth-session-mapper.ts`, `create-drizzle-repositories.ts`, `index.ts`
- `apps/api/src/infrastructure/repositories/memory/**`
- `apps/api/src/http/plugins/**`, `routes/auth.ts`, `routes/entries.ts`, `routes/periods.ts`, `schemas/auth-schemas.ts`, `schemas/entry-schemas.ts`, `schemas/period-schemas.ts`, `app.ts`, `errors/error-handler.ts`, `test-support/build-test-app.ts`
- `apps/api/src/db/initial-passwords-guard.ts`, `initial-passwords-input.ts`, `auth-sessions-audit.ts`, `apps/api/scripts/db-configure-initial-passwords.ts`, `db-audit-auth-sessions.ts`, `apps/api/package.json`, `package.json` (raiz), `scripts/connection-safety.test.ts`
- `apps/web/src/api/**`, `apps/web/src/state/**`, `apps/web/src/hooks/use-auth.ts`, `use-period-budgets.ts`, `apps/web/src/pages/LoginPage.tsx`, `apps/web/src/AppRoot.tsx`, `App.tsx`, `main.tsx`, `test-utils.tsx`
- `apps/web/src/components/layout/DashboardHeader.tsx`, `FinanceStatusScreen.tsx`
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_autenticacao.md`, `contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md`, `Docs/01_product/requisitos_funcionais.md`
- `README.md`, `apps/web/README.md`, `apps/api/README.md`, documentos deste bloco/sessão

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Dependências novas (`@node-rs/argon2`, `@fastify/cookie`, `@fastify/rate-limit`) registradas em `Docs/02_architecture/decisoes_tecnicas.md` (DT-14) — bibliotecas de terceiros para primitivas de segurança, nunca implementação própria.
- Checkpoint humano obrigatório antes de qualquer escrita real — migration e configuração de senhas exigem duas autorizações explícitas e separadas.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Ver `Docs/03_contracts/contrato_autenticacao.md` (preenchido por este bloco) — hash Argon2id, token opaco 256 bits via CSPRNG, banco só guarda hash SHA-256 do token, cookie `HttpOnly`/`SameSite=Lax`/`Secure` fora de development, mensagens de erro sempre genéricas, rate limit no login, `householdId` da sessão sempre validado contra a URL. `createHttpApp` continua recusando `runtimeMode: 'production'`.

## 8. Restrições de Performance

Não aplicável — uso doméstico local; Argon2id só custa CPU no login, validação de sessão usa SHA-256 (rápido).

## 9. Restrições de Design System

Reaproveitar tokens/componentes existentes (`fh-card`, tema roxo/preto); `LoginPage`/botão "Sair" seguem o mesmo padrão visual já usado no projeto.

## 10. Tarefas

1. Confirmar estado inicial; criar branch e bloco/prompt DDAE.
2. Inspecionar schema/bootstrap/serviços/rotas/frontend existentes.
3. Modelar `users.password_hash`/`password_configured_at` + `auth_sessions`; gerar migration `0003` (sem aplicar); registrar DT-14.
4. Implementar hashing de senha e token/hash de sessão, com testes.
5. Implementar porta/repositórios de autenticação (Drizzle e em memória).
6. Implementar serviços de autenticação (login/validação/logout).
7. Implementar rotas HTTP de auth + guard de proteção + CORS com credenciais; testes HTTP dedicados.
8. Derivar `createdByUserId`/`closedByUserId` da sessão; ajustar todos os testes HTTP pré-existentes para autenticar.
9. Criar scripts de configuração de senhas iniciais e de auditoria dedicados, com testes.
10. Implementar `AuthProvider`/`LoginPage`/`AppRoot` no frontend; remover `VITE_FINANHOUSE_HOUSEHOLD_ID`.
11. Escrever testes de frontend (cliente de auth, `AuthProvider`, `LoginPage`, integração `AppRoot`, StrictMode).
12. Rodar validações completas sem aplicar a migration; pré-flight somente leitura do banco.
13. Atualizar documentação (DT-14, `contrato_autenticacao.md`, contratos HTTP/frontend-backend/banco, RF-09, READMEs).
14. Preencher o conteúdo real deste bloco/prompt.
15. Apresentar checkpoint e aguardar as duas frases de autorização exatas (migration, depois senhas).

## 11. Critérios de Aceite

- [x] Migration `0003_auth_sessions.sql` gerada, revisada, não aplicada sem autorização.
- [x] Senha nunca em texto plano; token de sessão nunca persistido bruto.
- [x] Cookie `HttpOnly`, nunca `localStorage`/`sessionStorage`.
- [x] Toda rota financeira exige sessão válida e household correspondente.
- [x] `createdByUserId`/`closedByUserId` nunca vêm do corpo — sempre da sessão.
- [x] `FinanceProvider`/`usePeriodBudgets` nunca montam antes de autenticado; `householdId` nunca de env.
- [x] Suíte de testes ampliada sem reduzir a base anterior (971 testes ao final: 488 API + 330 web + 153 domínio).

## 12. Validações Locais Obrigatórias

- [x] `ddae-engine validate` / `ddae-engine audit`
- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`
- [x] `npx drizzle-kit check`
- [x] `npm audit --omit=dev` / `npm audit`
- [x] Pré-flight somente leitura do banco (`db:check`, `db:audit:auth-sessions -- --phase=before`) antes do checkpoint

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_19_autenticacao_real_e_sessao_domestica --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Status: **Aprovado com ressalvas — aguardando duas autorizações.** Implementação completa (schema, persistência, serviços, HTTP, frontend, testes, documentação) validada localmente sem tocar o banco real além de leitura; migration `0003_auth_sessions.sql` gerada e revisada, mas **não aplicada** — pendente da primeira frase de autorização do checkpoint (`AUTORIZO MIGRATION AUTH_SESSIONS FINANHOUSE_DEV`). Configuração das senhas iniciais depende de uma segunda frase de autorização separada, só solicitada após a migration aplicada e auditada. Este bloco só pode ser considerado concluído após as duas autorizações, auditorias e smoke-test.

## 15. Commit Semântico Sugerido

```
feat(auth): implementar autenticação e sessão doméstica
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
