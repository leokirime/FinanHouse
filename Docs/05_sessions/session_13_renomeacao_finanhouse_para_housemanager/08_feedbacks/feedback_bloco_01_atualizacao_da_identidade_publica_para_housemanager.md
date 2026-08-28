# Feedback — Bloco 01: Atualização da identidade pública para HouseManager

> Sessão: 13 (renomeacao_finanhouse_para_housemanager) · Projeto: HouseManager · Atualizado em: 2026-08-27

## 1. Resumo Executivo

A identidade pública do produto foi renomeada de "FinanHouse" para "HouseManager" em todo texto real voltado ao usuário e em toda documentação DDAE atual/viva, sem tocar nenhum identificador técnico interno, infraestrutura, endpoint, banco de dados ou histórico. Executado num worktree Git isolado (`C:\Users\leoki\HouseManager-Rename`, branch `feat/session-13-renomeacao-housemanager`, base `main` em `7b27f02703de6cfa4719d561fafd7467b4646021`), sem tocar o diretório/branch original onde o Bloco 06 da Sessão 12 permanece pausado com documentação não commitada. Método: inventário completo via `git grep -i`, classificação de cada ocorrência por contexto (identidade pública / identificador técnico / infraestrutura / banco / histórico) antes de qualquer edição — nunca uma substituição global cega. Resultado: suíte completa sem regressão de comportamento (API 667, Web 420, Domain 214 — total 1301, idêntico ao baseline, já que a mudança é só de texto). Uma pendência visual explícita permanece: o asset `finanhouse-logo-hero.png` ainda exibe a palavra "Finanhouse" desenhada graficamente na própria imagem — não foi redesenhado nem fabricado via código, conforme instrução explícita; fica registrado para uma rodada futura de design. **Aprovado visualmente pelo proprietário do projeto em 2026-08-27** — testado manualmente com a API e o frontend rodando localmente neste worktree. Autorizado a integrar em `main` nesta mesma rodada.

## 2. Objetivo do Bloco

Fazer a aplicação se apresentar ao usuário como "HouseManager" em todo texto público real, preservando identificadores técnicos internos, infraestrutura, endpoints, banco de dados e histórico DDAE.

## 3. Escopo Implementado

Exatamente o escopo planejado, sem divergência — inventário, classificação, renomeação da identidade pública real, atualização dos testes correspondentes, registro de DT-20.

## 4. Arquivos Criados

- `Docs/05_sessions/session_13_renomeacao_finanhouse_para_housemanager/**` (sessão inteira, incluindo bloco/prompt/feedback deste Bloco 01).

## 5. Arquivos Alterados

**Produção:**
- `apps/web/index.html` — `<title>`.
- `apps/web/src/components/brand/Brand.tsx` — alt text, texto tipográfico, doc comment.
- `apps/web/src/components/dashboard/HeroBrand.tsx` — alt text.
- `apps/web/src/components/financial-entries/DeleteEntryDialog.tsx` — texto do diálogo.
- `apps/web/src/components/layout/FinanceStatusScreen.tsx` — título padrão de carregamento.
- `apps/web/src/components/layout/Sidebar.tsx` — 2 `aria-label`s.
- `apps/web/src/pages/LoginPage.tsx` — heading.
- `apps/web/src/state/AuthProvider.tsx` — mensagem de erro de rede.
- `apps/web/src/AppRoot.tsx` — texto de status de carregamento.
- `apps/web/src/styles/tokens.css` — 2 comentários de identidade.
- `package.json` (raiz) — campo `description` (campo técnico `name` preservado).

**Testes** (só os que verificavam o texto alterado): `apps/web/index.test.ts`, `apps/web/src/App.test.tsx`, `apps/web/src/AppRoot.test.tsx`, `apps/web/src/components/brand/Brand.test.tsx`, `apps/web/src/components/dashboard/HeroBrand.test.tsx`, `apps/web/src/components/layout/Sidebar.test.tsx`, `apps/web/src/pages/{FinancialEntriesPage,LoginPage}.test.tsx`, `apps/web/src/state/AuthProvider.test.tsx`.

**Documentação:**
- `README.md` (raiz) — título + nota de transição (não espalhada pelo resto do documento).
- `apps/api/README.md`, `apps/web/README.md`, `packages/domain/README.md`, `packages/ui/README.md`, `assets/brand/README.md`, `assets/images/README.md` — linha descritiva.
- 29 documentos DDAE atuais/vivos (`Docs/00_ddae_engine/` ×4, `Docs/01_product/` ×5, `Docs/02_architecture/` ×9, `Docs/03_contracts/` ×6, `Docs/04_governance/` ×5) — só o cabeçalho `> Projeto:` (aplicado mecanicamente, com script verificando `lines[2].startsWith('> Projeto: FinanHouse')` antes de cada substituição — 29 de 29 confirmados, nenhum conteúdo além do nome do produto foi tocado em nenhuma linha).
- `Docs/02_architecture/decisoes_tecnicas.md` — nova DT-20 (além do cabeçalho).

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
git worktree add -b feat/session-13-renomeacao-housemanager C:\Users\leoki\HouseManager-Rename origin/main
npx ddae-engine session create "Renomeação FinanHouse para HouseManager"
npx ddae-engine block create "Atualização da identidade pública para HouseManager" --session session_13_renomeacao_finanhouse_para_housemanager
npx ddae-engine prompt create --block bloco_01_atualizacao_da_identidade_publica_para_housemanager --session session_13_renomeacao_finanhouse_para_housemanager
npm install
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test   # todos os workspaces
npx drizzle-kit check
npx ddae-engine validate
npx ddae-engine audit
```

## 8. Testes Realizados

- Suíte automatizada completa (API/Web/Domain) — ver seção 9/15.
- Verificação manual do asset `assets/images/finanhouse-logo-hero.png` (leitura visual da imagem) — confirmado que a palavra "Finanhouse" está desenhada graficamente dentro da própria imagem (não é só o nome do arquivo) — pendência registrada, não resolvida via código (instrução explícita: nunca redesenhar/fabricar logo).
- Verificação manual do `favicon.svg` — confirmado que é um glifo abstrato (casa/onda/gradiente), sem nenhum texto embutido — nenhum ajuste necessário.
- Reinspeção pós-alteração (`git grep -i "finanhouse"`) de todo `apps/web/src` — confirmado que **todo** resíduo remanescente é exatamente uma das categorias preservadas deliberadamente (import `@finanhouse/domain`, variável/filename do asset, e-mail de teste `.invalid`, env var `VITE_FINANHOUSE_HOUSEHOLD_ID`) — nenhum texto público esquecido.

## 9. Validações Executadas

| Validação | Resultado |
|---|---|
| `npm run build` | OK |
| `npm run verify:runtime` | OK |
| `npm run lint` | OK, 0 avisos |
| `npm run typecheck` | OK, 0 erros |
| `npm run typecheck:api-scripts` | OK, 0 erros |
| `npm run test` | OK — API 667 (inalterado), Web 420 (inalterado), Domain 214 (inalterado) — total 1301 |
| `npx drizzle-kit check` | OK ("Everything's fine") |
| `npx ddae-engine validate` | Status OK, 0 erros, 0 avisos |
| `npx ddae-engine audit` | Status OK, 0 erros, 0 P1/P2 |

## 10. Decisões Técnicas

- **DT-20 registrada** (`Docs/02_architecture/decisoes_tecnicas.md`) — ver decisão completa lá. Resumo: renomeação seletiva por contexto, nunca substituição global; identificadores técnicos/infraestrutura/histórico preservados por não trazerem benefício visível ao usuário e implicarem ripple real sem ganho.
- **Cabeçalho `> Projeto:` estendido a TODOS os documentos DDAE atuais/vivos, não só contratos.** A instrução original citava explicitamente "contratos que usam FinanHouse apenas como nome do produto no cabeçalho" como exemplo de identidade pública a renomear. Antes de agir, medi o escopo real (`git grep -l "Projeto: FinanHouse" -- Docs/00_ddae_engine Docs/01_product Docs/02_architecture Docs/03_contracts Docs/04_governance` → 29 arquivos) e apliquei a mesma lógica consistentemente a `Docs/00_ddae_engine/`, `01_product/`, `02_architecture/` e `04_governance/`, não só a `03_contracts/` — não há razão de contexto para tratar esses grupos de forma diferente (todos são documentação atual/viva do projeto, não histórico de sessão). `Docs/05_sessions/` (histórico de todas as 12 sessões anteriores) foi mantido inteiramente intocado, conforme regra explícita.
- **Compacto de `Brand`: "FH" → "HM".** A abreviação tipográfica exibida quando `compact` está ativo é texto público (visível ao usuário), não um identificador técnico — atualizada para coerência com o novo nome, com o teste correspondente ajustado.
- **`finanhouseLogoHero` (nome da variável de import) e `finanhouse-logo-hero.png` (nome do arquivo) mantidos inalterados.** São identificadores técnicos/nome de arquivo, nunca exibidos ao usuário — renomeá-los teria ripple (imports em 3 arquivos) sem nenhum benefício, e o próprio arquivo binário precisa ser substituído antes que o nome faça sentido (ver pendência P3).
- **Nota de transição concentrada só no `README.md` raiz e na DT-20** — não espalhada pelos 29 cabeçalhos de documentos nem pelos READMEs curtos dos workspaces, conforme instrução explícita de não espalhar esse texto por toda a documentação.

## 11. Problemas Encontrados

Nenhum bug de produção. Dois testes precisaram de correção durante a própria implementação (ver seção 12) — ambos por texto de asserção desatualizado após a mudança de branding, não por lógica quebrada.

## 12. Correções Aplicadas Durante o Bloco

- **`apps/web/index.test.ts`** verificava literalmente `<title>Finanhouse</title>` — não fazia parte do meu inventário inicial de `apps/web/src` porque vive na raiz de `apps/web/`, fora de `src/`. Descoberto ao rodar a suíte completa (falha real, não hipotética); corrigido e a suíte web voltou a 420/420.
- **1 falha transitória em `apps/api`** (`Test Files 1 failed | 62 passed (63)`) durante a primeira execução da suíte — investigada e confirmada como flutuação (nenhum arquivo de `apps/api` foi tocado nesta rodada); reexecução resultou em 667/667 consistentemente.

## 13. Pendências

### P1 — Crítica

_Nenhuma._

### P2 — Importante

_Nenhuma._

### P3 — Melhoria Recomendada

- _Resolvida em 2026-08-27 (ver Adendo, seção 19): asset `assets/images/finanhouse-logo-hero.png` exibia graficamente a palavra "Finanhouse" dentro da própria imagem. O proprietário forneceu o asset oficial `HouseManager.png`, já substituído nos três pontos de uso público (Sidebar, Hero do Dashboard, Login)._

### P4 — Opcional

- Renomeação do repositório GitHub, projeto/domínio Vercel e pasta local (`C:\Users\leoki\FinanHouse`) — avaliar futuramente; nenhuma delas é necessária para a identidade pública da aplicação em uso.

## 14. Riscos Restantes

Nenhum risco técnico ativo. O único ponto de atenção (asset visual do logo) está registrado como pendência de design, não como risco técnico.

## 15. Evidências

- `npm run test` (raiz, worktree `C:\Users\leoki\HouseManager-Rename`): **API 667 passed (667), Web 420 passed (420), Domain 214 passed (214)** — 0 falhas em qualquer workspace, idêntico ao baseline pré-Sessão 13.
- `npx ddae-engine audit`: Status OK, 0 erros, 0 P1/P2.
- Leitura visual confirmada de `assets/images/finanhouse-logo-hero.png` — wordmark "Finanhouse" presente graficamente na imagem (base da pendência P3).
- `git grep -i "finanhouse"` pós-alteração em `apps/web/src` — toda ocorrência remanescente confirmada como uma das categorias preservadas deliberadamente (nenhum texto público esquecido).
- **Aprovação visual do proprietário do projeto (2026-08-27):** identidade "HouseManager" testada manualmente pelo usuário (`npm run dev:api` + `npm run dev:web` no worktree `C:\Users\leoki\HouseManager-Rename`) e aprovada — identidade pública validada, funcionamento existente do produto preservado, identificadores técnicos legados (`@finanhouse/domain`, `fh-*`, `finanhouse_dev`, endpoints) deliberadamente mantidos. Para viabilizar esse teste manual, um `apps/web/.env.local` foi copiado localmente para este worktree — confirmado corretamente ignorado pelo Git (`apps/web/.gitignore:13:*.local`), nunca staged nem versionado; `apps/api/.env.local` não foi criado neste worktree.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

**Aprovado visualmente pelo proprietário do projeto em 2026-08-27.**

## 17. Próximo Bloco Recomendado

Nenhum bloco adicional planejado para esta sessão (Bloco 01 é o único). Após revisão/aprovação do proprietário e eventual versionamento, retomar a Sessão 12 (Bloco 06, pausado e intocado no diretório original).

## 18. Commit Semântico Sugerido

```
feat(identidade): renomear identidade publica de finanhouse para housemanager
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._

## 19. Adendo — Resolução da pendência visual do logo (2026-08-27)

Não é uma reabertura do Bloco 01 — registro complementar (branch `fix/session-13-logo-housemanager`, mesma base `main`) resolvendo a P3 deixada em aberto acima.

**O que mudou:** o proprietário do projeto forneceu diretamente o arquivo `assets/images/HouseManager.png` (PNG 1536×1024, RGBA com transparência real — mesmas dimensões do asset legado, mesma composição ícone-de-casa + wordmark + slogan "Casa, evolução e equilíbrio", agora sem o erro de digitação que o slogan legado aparentava ter). Usado exatamente como fornecido — nenhuma imagem foi gerada, editada, recortada, redimensionada fora de CSS ou redesenhada via código.

**Onde foi trocado:** `apps/web/src/components/dashboard/HeroBrand.tsx`, `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/pages/LoginPage.tsx` — só o `import`/`src` do asset (variável renomeada de `finanhouseLogoHero` para `housemanagerLogo`, refletindo a realidade). Nenhuma mudança estrutural de componente foi necessária: nenhuma das três ocorrências renderiza um texto "HouseManager" visível ao lado da imagem (Sidebar só a imagem dentro de um link; Hero mostra o nome do mês, não a marca; Login mantém a imagem `aria-hidden`/`alt=""` com uma frase de efeito diferente ao lado) — portanto a troca não duplicou o wordmark em nenhum contexto. Nenhuma alteração de CSS foi necessária (mesmas dimensões do arquivo antigo, mesmo `object-fit: contain` já em uso).

**Asset legado:** `assets/images/finanhouse-logo-hero.png` não é mais referenciado por nenhum componente de produção — mantido fisicamente no repositório (histórico/compatibilidade), não excluído nesta rodada.

**Documentação atualizada:** `Docs/02_architecture/decisoes_tecnicas.md` (DT-20, Status de resolução), `Docs/07_design_system/identidade_visual.md` (descrição do asset atual + resolução das pendências P4 do slogan), `apps/web/README.md` (parágrafo da logo). Também corrigido, nesta mesma rodada, um cabeçalho `> Projeto:` que havia ficado com "FinanHouse" em 13 documentos de `Docs/06_quality_gates/` e `Docs/07_design_system/` — não cobertos pela varredura original do Bloco 01 (gap identificado e fechado, não uma nova decisão de escopo).

**Testes:** `apps/web/src/App.test.tsx`, `apps/web/src/components/dashboard/HeroBrand.test.tsx`, `apps/web/src/components/layout/Sidebar.test.tsx` — as 3 asserções que verificavam `src` conter `finanhouse-logo-hero` passaram a verificar `HouseManager.png`.

**Resultado:** P3 (asset visual pendente) passa a **RESOLVIDA**. Nenhum identificador técnico, infraestrutura, endpoint ou banco foi tocado.

**Aprovação visual do proprietário do projeto (2026-08-27):** a nova identidade `HouseManager.png` foi testada visualmente e aprovada nos três pontos de uso público — Login (painel visual esquerdo), Sidebar (marca institucional no topo) e Hero/Dashboard (canto superior esquerdo do card da Visão Geral). Nenhuma duplicação de wordmark/slogan observada em nenhum dos três contextos. Autorizado a integrar em `main` nesta mesma rodada.
