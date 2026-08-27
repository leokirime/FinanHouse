# Prompt — Bloco 01: Atualização da identidade pública para HouseManager

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_13_renomeacao_finanhouse_para_housemanager/05_blocks/bloco_01_atualizacao_da_identidade_publica_para_housemanager.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Fazer a aplicação se apresentar ao usuário como "HouseManager" em todo texto público real, sem tocar identificadores técnicos internos, infraestrutura, endpoints, banco de dados ou histórico DDAE.

## 3. Escopo

Inventário e classificação por contexto de toda ocorrência de "FinanHouse"; renomeação apenas da identidade pública real (título, marca, login, erros/status, navegação, READMEs descritivos, `package.json` description, cabeçalho `> Projeto:` dos documentos DDAE atuais); atualização dos testes correspondentes; registro de DT-20.

## 4. Fora de Escopo

`@finanhouse/domain`, CSS `fh-*`, asset/variável do logo, banco/infraestrutura/env vars/cookie, histórico `Docs/05_sessions/session_01` a `session_12`, substituição do asset visual do logo, repositório GitHub/Vercel/pasta local, qualquer migration/Aiven/deploy, módulos futuros e Bloco 06 da Sessão 12.

## 5. Arquivos Permitidos

- `apps/web/index.html`, `apps/web/index.test.ts`
- `apps/web/src/components/brand/{Brand.tsx,Brand.test.tsx}`
- `apps/web/src/components/dashboard/{HeroBrand.tsx,HeroBrand.test.tsx}`
- `apps/web/src/components/financial-entries/DeleteEntryDialog.tsx`
- `apps/web/src/components/layout/{FinanceStatusScreen.tsx,Sidebar.tsx,Sidebar.test.tsx}`
- `apps/web/src/pages/{LoginPage.tsx,LoginPage.test.tsx,FinancialEntriesPage.test.tsx}`
- `apps/web/src/state/{AuthProvider.tsx,AuthProvider.test.tsx}`
- `apps/web/src/AppRoot.tsx`, `apps/web/src/AppRoot.test.tsx`, `apps/web/src/App.test.tsx`
- `apps/web/src/styles/tokens.css`
- `package.json` (raiz)
- READMEs: raiz, `apps/api`, `apps/web`, `packages/domain`, `packages/ui`, `assets/brand`, `assets/images`
- `Docs/00_ddae_engine/**`, `Docs/01_product/**`, `Docs/02_architecture/**` (incluindo `decisoes_tecnicas.md`), `Docs/03_contracts/**`, `Docs/04_governance/**` — só o cabeçalho `> Projeto:`
- Documentação da Sessão 13/Bloco 01

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Não aplicável — mudança de texto de apresentação; nenhum identificador de segurança real (cookie, env var, credencial) tocado.

## 8. Restrições de Performance

Não aplicável — troca de texto estático, sem consulta ou processamento novo.

## 9. Restrições de Design System

Reaproveitar integralmente `Brand`/`HeroBrand` existentes, só trocando o texto — nenhum componente/token novo. Pendência visual do asset do logo registrada, não resolvida via código.

## 10. Tarefas

1. Inventariar (`git grep -i "finanhouse"`) e classificar cada ocorrência por contexto antes de editar.
2. Editar apenas as ocorrências de identidade pública (uma de cada vez, confirmando o conteúdo antes de cada edição).
3. Atualizar os testes que verificam exatamente esse texto.
4. Verificar visualmente o asset do logo; registrar pendência se necessário.
5. Rodar suíte completa e validações obrigatórias.
6. Registrar DT-20; preencher Sessão/Bloco/prompt; criar feedback só depois de tudo validado.

## 11. Critérios de Aceite

- [x] Nenhuma substituição global cega.
- [x] Identidade pública real apresenta "HouseManager".
- [x] Identificadores técnicos/infraestrutura/histórico preservados.
- [x] Pendência do asset visual registrada.
- [x] Suíte completa sem regressão.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test`
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_01_atualizacao_da_identidade_publica_para_housemanager --session session_13_renomeacao_finanhouse_para_housemanager
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_13_renomeacao_finanhouse_para_housemanager/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(identidade): renomear identidade publica de finanhouse para housemanager
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
