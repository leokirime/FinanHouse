# Arquitetura Visual do Dashboard

> Projeto: FinanHouse · Gerado no Bloco 06 (`bloco_06_dashboard_visual_com_dados_simulados`) · 2026-07-25

> Este documento descreve como o dashboard visual (`apps/web`) é construído sobre dados **inteiramente simulados**. Não representa e não deve ser lido como evidência de conexão com o MySQL real ou de persistência de dados — ambos permanecem fora de escopo deste bloco (ver `Docs/02_architecture/regras_dominio_financeiro.md`, seção 11).

## 1. Camadas

```
apps/web/src/data/dashboard-fixtures.ts        (dados fictícios: Category, MonthlyPeriod, FinancialEntry)
        │
        ▼
apps/web/src/view-models/dashboard-view-model.ts   (única camada que lê fixtures + @finanhouse/domain)
        │
        ▼
apps/web/src/components/**  +  apps/web/src/pages/DashboardPage.tsx   (apenas renderizam o view-model)
```

- **Fixtures** (`data/dashboard-fixtures.ts`): arrays estáticos e determinísticos de `Category`, `MonthlyPeriod` e `FinancialEntry` — os mesmos tipos de `@finanhouse/domain` usados pela API. Nenhum valor é real; todos os nomes, valores e datas são fictícios.
- **View-model** (`view-models/dashboard-view-model.ts`): única função de entrada, `buildDashboardViewModel()`. É o único lugar do frontend que importa as fixtures e as funções de cálculo do domínio (`calculateMonthlySummary`, `compareMonthlyPeriods`). Produz objetos já formatados (`IndicatorCardViewModel`, `EvolutionPointViewModel`, etc.) prontos para renderização.
- **Componentes**: recebem apenas o resultado do view-model via props. Nenhum componente lê as fixtures diretamente, recalcula um resumo ou reimplementa uma fórmula financeira.

## 2. Regra de Fonte Única

Todo valor monetário exibido no dashboard — nos 4 indicadores, no gráfico de evolução, na distribuição por categoria, nas movimentações recentes e nas pendências — deriva da mesma coleção (`fixtureFinancialEntries`) processada pelas mesmas funções do domínio. Não há valores digitados independentemente em mais de um componente. Isso garante que os números batam entre si (ex.: a soma da distribuição por categoria corresponde à despesa do resumo mensal do mesmo período).

## 3. Uso de `@finanhouse/domain`

`apps/web` depende de `@finanhouse/domain` (workspace) como dependência real de produção — não apenas de desenvolvimento. As únicas funções do domínio usadas pelo frontend são puras e síncronas:

- `calculateMonthlySummary(periodId, entries)` — resumo de cada competência (usado para os indicadores e para cada ponto da evolução).
- `compareMonthlyPeriods(previous, current)` — variação percentual mês a mês (indicadores) e comparação de categorias.
- `formatMoney` (via `utils/format-money-pt-br.ts`) — conversão de centavos (`bigint`) para a string decimal, reformatada para pt-BR.

Nenhuma regra financeira foi reimplementada no frontend — o que existe em `apps/web` é somente leitura/apresentação sobre o resultado dessas funções.

## 4. Build do Domain no Frontend

Como `apps/web` agora importa `@finanhouse/domain`, ele depende do mesmo build real introduzido no Bloco 05 (`packages/domain/dist`, ver `feedback_bloco_05_regras_de_dominio_e_servicos_financeiros.md`):

- `npm run build` compila `domain` antes de `api`/`web` (ordem explícita no `package.json` raiz).
- `predev:web` reconstrói `domain` antes de `vite dev`.
- `pretest`/`pretypecheck` (raiz) reconstroem `domain` antes de testar/typechecar qualquer workspace, incluindo `web`.
- `apps/web` nunca importa arquivos `.ts` de `packages/domain/src` diretamente — sempre via `@finanhouse/domain`, cujo `package.json` aponta para `dist/`.

## 5. Formatação Monetária

`utils/format-money-pt-br.ts` reaproveita `formatMoney` do domínio (decimal-safe, baseado em `bigint`) e apenas reformata a string decimal resultante para o padrão pt-BR (separador de milhar `.`, decimal `,`, prefixo `R$`). Em nenhum momento um valor monetário é convertido para `number` para fins de formatação — só a string decimal (já seguramente derivada do `bigint`) é manipulada.

## 6. Protótipo Visual vs. Persistência Real — o que este bloco NÃO faz

- **Não afirma que os dados estão salvos.** Os CTAs "Nova movimentação" e "Revisar mês" são inertes (`aria-disabled`, sem `onClick` funcional) — clicar neles não persiste nada e não deve produzir nenhuma mensagem de sucesso.
- **Não conecta ao MySQL.** Nenhum arquivo de `apps/web` importa `mysql2`, `drizzle-orm`, `.env*` ou qualquer caminho de `apps/api/src/db/`.
- **Não implementa autenticação** — o dashboard é acessível sem login, por ser um protótipo interno.
- Quando a persistência real for liberada (pós-TLS, Bloco 04), a substituição esperada é trocar `dashboard-fixtures.ts` por dados vindos de repositórios reais **através do mesmo formato de entrada** que `buildDashboardViewModel()` já espera (`Category[]`, `MonthlyPeriod[]`, `FinancialEntry[]`) — a função do view-model e os componentes não precisam mudar.

## 7. O Que Ainda Não Existe

- Páginas para "Movimentações", "Comparativo", "Planejamento", "Histórico", "Configurações" (apenas itens de navegação não funcionais).
- Qualquer chamada HTTP real a `apps/api` a partir do frontend.
- Logo oficial (ver `Docs/07_design_system/identidade_visual.md`, seção 8).
