# Bloco 17 — Integração direta do frontend com a API real

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-01

## 1. Objetivo

Substituir o modo demonstrativo do frontend (`FinanceDemoProvider`, estado em memória com fixtures) por um corte direto para a API HTTP real do Bloco 16, sem fallback demonstrativo em runtime, migrando Dashboard, Movimentações, Comparativo, Histórico e Planejamento.

## 2. Contexto

DT-11 (Bloco 16) deixou explícito que a integração do frontend era o próximo passo pendente de RF-05. O proprietário decidiu não manter os dois modos (demo + real) simultaneamente — Git é o mecanismo de reversão, não uma bandeira de configuração.

## 3. Problema que Este Bloco Resolve

O frontend lia/escrevia exclusivamente um estado local em memória inicializado por fixtures fictícias (`data/dashboard-fixtures.ts`), mesmo com a API HTTP real disponível desde o Bloco 16 — nenhuma tela usava dados reais do banco.

## 4. Escopo

- Cliente HTTP do frontend (`apps/web/src/api/**`): config, erros, `fetch` com timeout/`AbortController`, mapeadores DTO↔domínio.
- `FinanceProvider` real (substitui `FinanceDemoProvider`): carrega categorias/membros/competências/movimentações da API; mutações aguardam resposta HTTP; nunca cai para fixtures em caso de erro.
- Migração de Dashboard, Movimentações, Comparativo, Histórico e Planejamento para o novo provider.
- Planejamento usa movimentações reais (`status: planned/pending`) via `financial_entries` — limites por categoria (`CategoryBudget`) permanecem sem persistência própria, distribuição por categoria calculada apenas a partir de movimentações reais.
- Script de bootstrap estrutural permanente (`apps/api/scripts/db-bootstrap-household.ts`, `db:bootstrap:household`) para criar household/usuários/membros/categorias iniciais em `finanhouse_dev`.
- Remoção do modo demonstrativo do runtime (`FinanceDemoProvider`, `financeDemoReducer`, `data/dashboard-fixtures.ts`), preservando a mesma lógica como infraestrutura de teste (`apps/web/src/state/test-support/`).
- Documentação: DT-12, contrato frontend/backend, RF-05, READMEs, `estado_temporario_frontend.md`.

## 5. Fora de Escopo

- Autenticação real — permanece pendente.
- Persistência de limites por categoria (orçamento) — exige tabela e endpoints próprios, bloco futuro.
- Nova migration, seed genérico, deploy, acesso a produção.
- Endpoints de escrita para `users`/`households` via API HTTP (o bootstrap usa Drizzle direto, como o smoke-test do Bloco 14/16).

## 6. Arquivos e Pastas Envolvidos

- `apps/web/src/api/**` (novo)
- `apps/web/src/state/FinanceProvider.tsx`, `finance-context.ts`, `finance-types.ts` (novos); `state/test-support/**` (novo, apenas teste)
- `apps/web/src/hooks/use-finance.ts`, `use-mutation-dialog.ts` (novos)
- `apps/web/src/pages/*.tsx`, `apps/web/src/components/financial-entries/*`, `apps/web/src/components/planning/*`, `apps/web/src/components/layout/{Sidebar,FinanceStatusScreen}.*`
- `apps/web/src/App.tsx`, `main.tsx`, `test-utils.tsx`
- Removidos: `apps/web/src/state/FinanceDemoProvider.tsx`, `finance-demo-*.ts`, `apps/web/src/hooks/use-finance-demo.ts`, `apps/web/src/data/dashboard-fixtures.ts`
- `apps/api/scripts/db-bootstrap-household.ts`, `apps/api/src/db/household-bootstrap-guard.ts`, `household-bootstrap-input.ts`
- `apps/api/package.json`, `package.json` (raiz) — script `db:bootstrap:household`
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-12), `Docs/03_contracts/contrato_frontend_backend.md`, `Docs/01_product/requisitos_funcionais.md`, `Docs/02_architecture/estado_temporario_frontend.md`
- `README.md`, `apps/web/README.md`, `apps/api/README.md`, README/bloco/prompt/feedback da sessão

## 7. Dependências

DT-11 (Bloco 16) — API HTTP financeira v1 concluída e validada.

## 8. Plano de Implementação

1. Confirmar estado inicial (git, branch, DDAE).
2. Inspecionar frontend (demo provider, view-models, páginas) e API (contrato, rotas, DTOs).
3. Registrar DT-12.
4. Criar cliente HTTP (`apps/web/src/api/**`) e utilitário de competência civil.
5. Criar `FinanceProvider` real e hooks (`useFinance`/`useReadyFinance`).
6. Migrar Dashboard, Movimentações, Comparativo, Histórico para o novo provider.
7. Migrar Planejamento para movimentações reais (sem limite por categoria).
8. Remover código demonstrativo do runtime; portar reducer/fixtures equivalentes para `state/test-support/` (uso exclusivo em teste).
9. Criar script de bootstrap estrutural + guards + validação de entrada + testes.
10. Escrever/ajustar testes (cliente HTTP, provider, páginas, bootstrap).
11. Atualizar documentação.
12. Validações locais completas; pré-flight somente leitura; checkpoint; aguardar autorização.
13. Executar bootstrap autorizado; auditar; configurar `.env.local`; validar funcionalmente.
14. Remoção definitiva de qualquer resquício demonstrativo; commit; push; merge.

## 9. Critérios de Aceite

- [x] Frontend consome exclusivamente a API HTTP real — nenhum fallback demonstrativo em runtime.
- [x] Dashboard, Movimentações, Comparativo, Histórico e Planejamento migrados.
- [x] Planejamento funcional com movimentações reais (`planned`/`pending`); limite por categoria explicitamente pendente, sem simulação.
- [x] Mutações aguardam resposta HTTP antes de fechar diálogos; duplo envio impedido (guarda por `ref`, não só por estado).
- [x] Estados de carregamento/erro/retry explícitos, sem dados fictícios.
- [x] Bootstrap estrutural autorizado e executado em `finanhouse_dev` (`AUTORIZO BOOTSTRAP INICIAL FINANHOUSE_DEV`).
- [x] Suíte de testes preservada e ampliada, sem referência a `FinanceDemoProvider`/fixtures fora de `state/test-support/`.

## 10. Validações Obrigatórias

- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`
- [x] `npx ddae-engine validate` / `npx ddae-engine audit`
- [x] `npm audit --omit=dev`
- [x] `npm run db:check` / `db:audit:schema -- --phase=after` / `db:audit:responsible-member -- --phase=after` (pré-flight, antes da autorização — banco vazio confirmado)

## 11. Segurança

Nenhuma autenticação real ainda — `createdByUserId` é resolvido como o membro `role: 'owner'` do household configurado, não um usuário autenticado. `VITE_FINANHOUSE_HOUSEHOLD_ID`/`VITE_API_BASE_URL` não são credenciais, mas `apps/web/.env.local` nunca é commitado. O bootstrap estrutural exige confirmação explícita (`CONFIRM_HOUSEHOLD_BOOTSTRAP=true`) e nunca roda em produção (guards de provider/ambiente/banco). Nenhum dado pessoal (nome/e-mail) é impresso em log pelo bootstrap — apenas IDs técnicos.

## 12. Performance

Não aplicável — carga local, dataset pessoal pequeno; cliente HTTP usa timeout objetivo (10s) e cancela requisições obsoletas via `AbortController`.

## 13. Design System / UX

Reaproveita integralmente os tokens/componentes existentes (`fh-card`, `fh-badge`, etc.); nova tela de status de carregamento/erro (`FinanceStatusScreen`) segue a mesma identidade visual. Badge "Dados simulados" removido da sidebar (não fazia mais sentido sem modo demonstrativo).

## 14. Riscos

- Sem autenticação, `createdByUserId` sempre aponta para o membro `owner` — não distingue qual pessoa do household realizou a ação.
- Limite por categoria (orçamento) segue sem persistência — risco de expectativa do usuário sobre uma funcionalidade ainda não implementada, mitigado pela mensagem explícita na UI.
- Integração assume um único household residencial, sem multiusuário concorrente real.

**Correção pós-bloco (Codex, 2026-08-01):** um bug real de `React.StrictMode` (`mountedRef` compartilhado entre execuções do efeito de carga) causava loading infinito no `FinanceProvider` em desenvolvimento. Corrigido fora desta sessão, sem reabrir este bloco — ver `08_feedbacks/feedback_bloco_17_integracao_direta_do_frontend_com_a_api_real.md`, seção 19.

## 15. Pendências Esperadas

- P3 — Autenticação real e persistência de limites por categoria (orçamento): próximos passos naturais do roadmap (RF-05), não pendências deste bloco.
- P3 — `createdByUserId` resolvido pelo primeiro membro `owner` do household, sem usuário autenticado real.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_17_integracao_direta_do_frontend_com_a_api_real --session session_11_fundacao_do_finanhouse` — ver `08_feedbacks/feedback_bloco_17_integracao_direta_do_frontend_com_a_api_real.md`.

## 17. Commit Semântico Sugerido

```
feat(web): integrar frontend com API financeira real
```
