# Responsividade

> Projeto: HouseManager · Atualizado em: 2026-07-25

## 1. Objetivo

Definir os breakpoints e o comportamento esperado de layout em cada um, para que nenhuma tela seja construída só pensando em desktop (ou só em mobile).

## 2. Breakpoints

Definidos via `max-width` (mobile-first invertido — desktop é o layout base, breakpoints reduzem a partir dele), testados nas larguras de referência do Bloco 06:

| Nome | Largura | Dispositivo típico |
|---|---|---|
| Desktop | ≥ 1024px | Desktop (testado em ~1440px e ~1024px) |
| Tablet | 768px – 1023px | Tablet |
| Mobile | ≤ 767px | Mobile (testado em ~390px) |

## 3. Comportamento por Breakpoint

**Desktop (≥1024px)**
- `AppShell`: sidebar fixa à esquerda (`--fh-sidebar-width` = 264px) + conteúdo.
- `DashboardPage`: indicadores em 4 colunas (`fh-dashboard-page__indicators`); evolução financeira + distribuição por categoria lado a lado (2fr/1fr); movimentações recentes + pendências lado a lado (2fr/1fr).

**Tablet (768–1023px)**
- `AppShell` empilha verticalmente: `Sidebar` vira uma barra horizontal no topo (nav em linha, rolável horizontalmente se necessário), conteúdo abaixo — "sidebar reduzida", sem JS de collapse.
- Indicadores caem para 2 colunas; evolução/categoria e recentes/pendências empilham em 1 coluna.

**Mobile (≤767px, testado em 390px)**
- Indicadores em 1 coluna.
- Tabela de `RecentEntries` vira lista empilhada (cada linha vira um bloco com `label: valor`, via `td::before { content: attr(data-label) }`) — sem rolagem horizontal.
- `DashboardHeader` esconde o texto do perfil doméstico (mantém o CTA); ações ocupam a largura disponível.
- `Sidebar`: badges "em breve" somem abaixo de 480px para economizar espaço horizontal.

## 4. Regras Obrigatórias

- [x] Toda tela nova é validada visualmente em pelo menos um breakpoint mobile e um desktop antes de ser considerada concluída — dashboard verificado via build servido (`vite preview`) e testes de render; inspeção visual completa em navegador real fica para o checkpoint visual anunciado pelo proprietário antes do merge.
- [x] Nenhum elemento interativo fica inacessível (cortado, sobreposto) em nenhum breakpoint suportado — nav horizontal com `overflow-x: auto` no tablet evita corte.
- [x] Nenhuma tabela exige rolagem horizontal obrigatória em mobile (vira lista).

## 5. Perguntas Orientadoras

- Esta tela foi desenhada mobile-first ou desktop-first? Isso está consistente com o resto do produto?
- Existe algum componente que se comporta mal especificamente em telas muito estreitas ou muito largas?

## 6. Decisões Pendentes

- P3 — Inspeção visual em navegador real (não apenas build servido + testes de render) nas larguras 1440/1024/768/390px fica pendente do checkpoint visual do proprietário antes do merge à `main`.
