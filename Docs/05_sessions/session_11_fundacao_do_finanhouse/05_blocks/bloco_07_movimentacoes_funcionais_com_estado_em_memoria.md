# Bloco 07 — Movimentações funcionais com estado em memória

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Transformar a área de Movimentações em uma funcionalidade navegável e interativa, permitindo criar, editar e alterar estados de receitas e despesas durante a sessão do navegador, sem banco de dados ou persistência permanente.

## 2. Contexto

O Bloco 06 entregou o dashboard visual com dados simulados, aprovado funcionalmente pelo proprietário (com refinamento visual pendente, registrado em `Docs/07_design_system/backlog_refinamento_visual.md`) e já integrado à `main`. O próximo passo natural é tornar a segunda área da sidebar ("Movimentações") funcional, preparando a aplicação para receber a API e o MySQL reais no futuro sem reescrever a camada de apresentação.

## 3. Problema que Este Bloco Resolve

O dashboard hoje é somente leitura sobre fixtures estáticas — não é possível demonstrar o ciclo de vida real de uma movimentação (criar, editar, marcar como pendente, realizar, cancelar, reativar) nem ver o dashboard reagir a essas mudanças. Este bloco resolve isso introduzindo um estado compartilhado em memória, único para toda a aplicação, e uma tela de Movimentações que opera sobre esse estado usando as regras já existentes em `@finanhouse/domain`.

## 4. Escopo

- Instalação de `react-router` e rotas reais: `/` (Visão geral) e `/movimentacoes`. Migrado de `react-router-dom@7.18.1` para `react-router@8.3.0` antes da integração à `main`, por correção de segurança (DT-02 superada pela DT-03 — ver `Docs/02_architecture/decisoes_tecnicas.md`).
- Estado financeiro compartilhado em memória (`apps/web/src/state/`): provider, reducer, contexto e hook de acesso.
- `dashboard-view-model.ts` adaptado para receber movimentações/competência/categorias como argumentos, em vez de importar as fixtures diretamente.
- Página `FinancialEntriesPage` com listagem, filtros, busca e ações contextuais por status.
- Formulário de criação de movimentação (modal/drawer acessível).
- Edição de movimentações `planned`/`pending`.
- Transições de status explícitas: `planned→pending`, `planned→cancelled`, `pending→realized`, `pending→cancelled`, `cancelled→planned` (reativação), e `realized→pending` (estorno) apenas se já suportado e testado no domínio.
- Diálogo de realização (valor realizado + data) e de cancelamento (com confirmação).
- Atualização automática do dashboard após qualquer alteração de estado.
- Aviso de "modo demonstrativo" visível na página de Movimentações.
- 38 testes automatizados cobrindo navegação, CRUD, transições, filtros, integração com o dashboard e ausência de persistência.
- Documentação do estado temporário e atualização de requisitos funcionais/design system/README.

## 5. Fora de Escopo

- MySQL, Drizzle em runtime, migration, seed, API HTTP real.
- `localStorage`, `IndexedDB`, cookies de persistência, service worker.
- Autenticação, upload de arquivos, recorrências, parcelamentos, orçamento por categoria.
- Redesign do dashboard (o refinamento visual do Bloco 06 permanece como backlog separado).
- Deploy.

## 6. Arquivos e Pastas Envolvidos

- `apps/web/src/state/{finance-demo-types,finance-demo-reducer,finance-demo-context,FinanceDemoProvider}.tsx?`
- `apps/web/src/hooks/use-finance-demo.ts`
- `apps/web/src/pages/FinancialEntriesPage.tsx`
- `apps/web/src/components/financial-entries/**`
- `apps/web/src/components/layout/{AppShell,Sidebar}.tsx` (navegação real)
- `apps/web/src/view-models/dashboard-view-model.ts` (adaptado para receber argumentos)
- `apps/web/src/App.tsx`, `apps/web/src/main.tsx` (roteador)
- `apps/web/package.json` (dependência `react-router`)
- `Docs/02_architecture/estado_temporario_frontend.md`, `Docs/01_product/requisitos_funcionais.md`, `Docs/07_design_system/componentes_ui.md`, `apps/web/README.md`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`

## 7. Dependências

- Bloco 06 (dashboard visual, integrado à `main` em `26ec450`)
- `@finanhouse/domain` (Bloco 05) — regras e serviços de movimentação/competência

## 8. Plano de Implementação

1. Instalar `react-router@8.3.0` (versão compatível com React 19 já em uso, correção oficial da vulnerabilidade que motivou a DT-03) e configurar rotas `/` e `/movimentacoes` em `App.tsx`.
2. Criar o estado compartilhado (`state/`) com reducer cobrindo criação, edição e todas as transições de status, inicializado a partir das fixtures existentes.
3. Adaptar `dashboard-view-model.ts` para receber `entries`/`categories`/`currentPeriod`/`previousPeriod` como argumentos.
4. Envolver a aplicação com `FinanceDemoProvider` em `main.tsx`/`App.tsx`.
5. Atualizar `Sidebar` para navegação real (`react-router` `Link`/`NavLink`) mantendo apenas "Visão geral" e "Movimentações" habilitadas.
6. Criar `FinancialEntriesPage` com listagem, filtros e busca.
7. Criar o formulário de criação/edição e os diálogos de realização/cancelamento, usando os serviços de `@finanhouse/domain`.
8. Ligar as ações da página ao reducer; garantir que o dashboard reflita as mudanças.
9. Escrever os 38 testes obrigatórios.
10. Documentar e gerar o feedback oficial.

## 9. Critérios de Aceite

- [ ] Navegação real entre "Visão geral" e "Movimentações", com `aria-current="page"` na rota ativa.
- [ ] Dashboard e Movimentações leem do mesmo estado compartilhado — nenhuma fixture lida diretamente por componente de UI.
- [ ] Todas as transições de status usam as funções nomeadas de `@finanhouse/domain` — nenhuma regra financeira duplicada no frontend.
- [ ] Criação/edição validam usando o domínio (valor positivo, duas casas decimais, categoria/membro ativos, competência aberta).
- [ ] Realização exige valor e data explícitos, sem assumir automaticamente o valor previsto.
- [ ] Cancelamento exige confirmação e limpa `actualAmount`/`realizationDate`.
- [ ] Ao recarregar a página, o estado volta às fixtures iniciais — comportamento comunicado na UI.
- [ ] Nenhum uso de `localStorage`, `IndexedDB`, `mysql2`, `drizzle-orm` ou `.env*`.
- [ ] Pelo menos 38 novos testes, todos passando, somados aos 178 já existentes.

## 10. Validações Obrigatórias

- [ ] `npm ci`
- [ ] `npm run clean`
- [ ] `npm run build`
- [ ] `npm run verify:runtime`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `npm audit --omit=dev` / `npm audit`

## 11. Segurança

Nenhum dado real é usado (fixtures sintéticas). Nenhuma autenticação implementada (fora de escopo). Formulários validam entrada localmente via `@finanhouse/domain`, mas não há fronteira de confiança real (estado vive só no navegador, não é enviado a lugar nenhum).

## 12. Performance

Estado em memória via `useReducer`/Context — sem I/O. `react-router` é a única dependência de runtime nova; sem bibliotecas adicionais de formulário/modal.

## 13. Design System / UX

Reaproveita tokens e componentes do Bloco 06 (`fh-card`, `fh-badge`, `fh-grid`, etc.) — nenhum novo token de cor introduzido. Novos componentes seguem o inventário em `Docs/07_design_system/componentes_ui.md`.

## 14. Riscos

- Introduzir estado compartilhado e roteamento é uma mudança estrutural maior que os blocos visuais anteriores — risco mitigado por manter o view-model do dashboard "burro" (recebe dados prontos, não sabe de onde vêm).
- Reaproveitar exatamente as regras de transição do domínio evita divergência entre o que a UI permite e o que o domínio permite — testado explicitamente.

## 15. Pendências Esperadas

- P3 — Quando a API real existir, o `FinanceDemoProvider` deve ser substituído por um provider que fala com a API via HTTP, mantendo a mesma interface de hook (`useFinanceDemo`).
- P4 — Reavaliar o roteamento se uma futura versão do React Router alterar novamente a superfície de pacotes/APIs (ver DT-03).
- P3 — Refinamento visual do dashboard (Bloco 06) e da nova página de Movimentações permanece pendente de sessão dedicada.
- P4 — Estorno (`realized→pending`) só será implementado se a regra e o serviço já existirem no domínio prontos para reutilização — caso contrário, fica para bloco futuro.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_07_movimentacoes_funcionais_com_estado_em_memoria --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

```
feat(web): implementar movimentações com estado em memória
```
