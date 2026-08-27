# Bloco 01 — Atualização da identidade pública para HouseManager

> Sessão: 13 (renomeacao_finanhouse_para_housemanager) · Projeto: HouseManager · Atualizado em: 2026-08-27

## 1. Objetivo

Fazer a aplicação se apresentar ao usuário como "HouseManager" em todo texto público real, sem tocar identificadores técnicos internos, infraestrutura, endpoints, banco de dados ou histórico DDAE.

## 2. Contexto

Decisão do proprietário do projeto: HouseManager passa a ser a identidade pública do produto (central de gerenciamento da casa; finanças é um domínio importante, não o produto inteiro). Executado como Sessão 13, isolada em worktree próprio a partir de `main` (`7b27f02703de6cfa4719d561fafd7467b4646021`), para não interferir no Bloco 06 da Sessão 12 (pausado, documentação não commitada). Ver `Docs/02_architecture/decisoes_tecnicas.md`, DT-20.

## 3. Problema que Este Bloco Resolve

O produto se apresenta ao usuário com o nome antigo ("FinanHouse") em toda a interface, enquanto a decisão de produto já determinou a nova identidade pública ("HouseManager") — sem essa atualização, qualquer teste visual ou apresentação do produto usaria o nome errado.

## 4. Escopo

- Inventário completo (via `git grep -i`) de toda ocorrência de "FinanHouse"/variações no repositório.
- Classificação de cada ocorrência em: identidade pública (renomear), identificador técnico (manter), infraestrutura (manter), banco de dados (manter), histórico DDAE (manter).
- Renomeação de toda identidade pública real: `<title>` HTML, componentes de marca (`Brand`, `HeroBrand`), heading de login, mensagens de erro/status voltadas ao usuário, `aria-label`s de navegação, `description` do `package.json` raiz, READMEs descritivos (raiz e workspaces/pacotes/assets), cabeçalho `> Projeto:` dos 29 documentos DDAE atuais/vivos (`Docs/00_ddae_engine/`, `01_product/`, `02_architecture/`, `03_contracts/`, `04_governance/`).
- Atualização dos testes que verificam exatamente esse texto público.
- Registro formal: DT-20, Sessão 13, este bloco.

## 5. Fora de Escopo

- `@finanhouse/domain` (namespace de pacote), classes CSS `fh-*`, variável/arquivo do asset de logo (`finanhouseLogoHero`/`finanhouse-logo-hero.png`), `name` do `package.json` raiz, e-mails de teste `@finanhouse.invalid`.
- Banco `finanhouse_dev`/`finanhouse_prod`, usuário `finanhouse_dev_app`, projeto/serviço Aiven, variáveis de ambiente `FINANHOUSE_*`/`VITE_FINANHOUSE_HOUSEHOLD_ID`, cookie `finanhouse_session`.
- Qualquer documento de `Docs/05_sessions/session_01` a `session_12` (histórico).
- Substituição do asset visual do logo (contém a palavra "Finanhouse" desenhada na imagem) — apenas registrado como pendência.
- Repositório GitHub, projeto/domínio Vercel, pasta local `C:\Users\leoki\FinanHouse`.
- Qualquer migration, acesso ao Aiven, seed/bootstrap, deploy.
- Implementação dos módulos futuros do HouseManager (Agenda, Casa, etc.) e Bloco 06 da Sessão 12.

## 6. Arquivos e Pastas Envolvidos

Alterados (produção): `apps/web/index.html`, `apps/web/src/components/brand/Brand.tsx`, `apps/web/src/components/dashboard/HeroBrand.tsx`, `apps/web/src/components/financial-entries/DeleteEntryDialog.tsx`, `apps/web/src/components/layout/{FinanceStatusScreen,Sidebar}.tsx`, `apps/web/src/pages/LoginPage.tsx`, `apps/web/src/state/AuthProvider.tsx`, `apps/web/src/AppRoot.tsx`, `apps/web/src/styles/tokens.css`, `package.json` (raiz).

Alterados (testes): `apps/web/index.test.ts`, `apps/web/src/App.test.tsx`, `apps/web/src/AppRoot.test.tsx`, `apps/web/src/components/brand/Brand.test.tsx`, `apps/web/src/components/dashboard/HeroBrand.test.tsx`, `apps/web/src/components/layout/Sidebar.test.tsx`, `apps/web/src/pages/{FinancialEntriesPage,LoginPage}.test.tsx`, `apps/web/src/state/AuthProvider.test.tsx`.

Alterados (documentação): `README.md` (raiz), `apps/api/README.md`, `apps/web/README.md`, `packages/domain/README.md`, `packages/ui/README.md`, `assets/brand/README.md`, `assets/images/README.md`, 29 documentos em `Docs/00_ddae_engine/`, `Docs/01_product/`, `Docs/02_architecture/` (incluindo `decisoes_tecnicas.md`, nova DT-20), `Docs/03_contracts/`, `Docs/04_governance/`.

Criados: `Docs/05_sessions/session_13_renomeacao_finanhouse_para_housemanager/**` (esta sessão).

## 7. Dependências

- `main` em `7b27f02703de6cfa4719d561fafd7467b4646021` — Sessão 12 (Blocos 01–05 integrados, Bloco 05 aprovado visualmente e integrado).
- Worktree isolado (`C:\Users\leoki\HouseManager-Rename`) — nenhuma dependência do estado não commitado do Bloco 06 da Sessão 12.

## 8. Plano de Implementação

1. Confirmar checkpoint (branch/HEAD do diretório original intocado; `origin/main` sem divergência).
2. Criar worktree isolado a partir de `origin/main`, branch `feat/session-13-renomeacao-housemanager`.
3. Criar Sessão 13 e Bloco 01 via `ddae-engine`.
4. Inventariar todas as ocorrências de "FinanHouse"/variações (`git grep -i`), por diretório e por arquivo.
5. Classificar cada ocorrência por contexto (identidade pública / técnico / infraestrutura / banco / histórico) antes de qualquer edição.
6. Editar apenas as ocorrências classificadas como identidade pública, uma de cada vez, confirmando o conteúdo exato antes de cada edição.
7. Atualizar os testes que verificam esse texto público.
8. Verificar visualmente o asset de logo (`finanhouse-logo-hero.png`) — registrar pendência se contiver o nome antigo desenhado na imagem.
9. Rodar a suíte completa e todas as validações obrigatórias.
10. Registrar DT-20; preencher Sessão/Bloco/prompt; criar feedback só depois de tudo validado.

## 9. Critérios de Aceite

- [x] Nenhuma substituição global cega — cada ocorrência analisada por contexto antes de editar.
- [x] `<title>` HTML, marca, login, mensagens de erro/status e navegação apresentam "HouseManager".
- [x] `@finanhouse/domain`, CSS `fh-*`, `finanhouse_dev`/`finanhouse_prod`, variáveis de ambiente, cookie de sessão e e-mails de teste permanecem inalterados.
- [x] Nenhum documento de `Docs/05_sessions/session_01` a `session_12` foi alterado.
- [x] Cabeçalho `> Projeto:` atualizado nos 29 documentos DDAE atuais/vivos.
- [x] Pendência do asset visual do logo registrada explicitamente (não considerada resolvida).
- [x] Suíte completa sem regressão (mesma contagem de testes — mudança é só de texto).
- [x] Nenhuma migration, acesso ao Aiven, ou alteração de dado real.

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (todos os workspaces)
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine validate`
- [x] `npx ddae-engine audit`

## 11. Segurança

Não aplicável — mudança de texto de apresentação, nenhuma superfície de autenticação/autorização/entrada de usuário alterada. Confirmado que nenhum identificador de segurança real (cookie de sessão, variável de ambiente, credencial) foi tocado.

## 12. Performance

Não aplicável — nenhuma consulta nova, nenhum processamento adicional; troca de texto estático.

## 13. Design System / UX

Nenhum token/componente novo. Reaproveita integralmente os componentes de marca existentes (`Brand`, `HeroBrand`) apenas trocando o texto que exibem. Pendência visual registrada: o asset `finanhouse-logo-hero.png` ainda mostra graficamente a palavra "Finanhouse" — fica para uma rodada futura de design.

## 14. Riscos

- Risco de escopo: confundir "identidade pública" com "toda ocorrência da string" — mitigado pela classificação explícita por contexto (seção 4/5) antes de qualquer edição.
- Risco de regressão em teste: textos de marca/erro são verificados por testes de comportamento existentes — mitigado atualizando exatamente os mesmos testes que verificam o texto alterado, nenhum outro.

## 15. Pendências Esperadas

- P3 — Asset visual `assets/images/finanhouse-logo-hero.png` contém a palavra "Finanhouse" desenhada graficamente na imagem — precisa ser substituído por uma versão "HouseManager" numa rodada futura de design/branding. Não é um defeito deste bloco (nenhuma logo foi fabricada via código, conforme instrução explícita), apenas uma pendência visual documentada.
- P4 — Renomeação do repositório GitHub, projeto/domínio Vercel e pasta local — avaliar futuramente, fora do escopo desta sessão.

## 16. Feedback Obrigatório

Feedback gerado via `ddae-engine feedback create --block bloco_01_atualizacao_da_identidade_publica_para_housemanager --session session_13_renomeacao_finanhouse_para_housemanager` após esta validação completa.

## 17. Commit Semântico Sugerido

```
feat(identidade): renomear identidade publica de finanhouse para housemanager
```
