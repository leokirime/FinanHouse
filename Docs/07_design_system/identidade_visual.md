# Identidade Visual

> Projeto: HouseManager · Atualizado em: 2026-08-01

> Este documento existe para que um agente de IA gerando UI não "invente" cores, fontes ou logo — ele consulta aqui primeiro.

## 1. Objetivo

Definir a identidade visual de forma específica o suficiente para que qualquer pessoa ou agente produza UI visualmente consistente sem supervisão constante.

## 2. Logo

**A logo oficial é `assets/images/HouseManager.png`** (PNG, 1536×1024, RGBA com canal alfa real — confirmado por inspeção binária do arquivo, não apenas pela extensão), fornecida diretamente pelo proprietário do projeto (Sessão 13, correção visual pós-renomeação, 2026-08-27) — composição horizontal completa (ícone de casa + wordmark "HouseManager" + slogan "Casa, evolução e equilíbrio"). Possui duas ocorrências intencionais na interface, ambas usando o **mesmo arquivo**, nunca editado/recortado, apenas redimensionado via CSS em cada contexto (mesma estratégia já validada com o asset anterior):

1. **Navegação lateral (`Sidebar.tsx`), desde o Bloco 16 (2026-08-01):** ocorrência institucional permanente, no topo da sidebar, antes dos itens de navegação, envolta em um link para `/` (`aria-label="Ir para a visão geral do HouseManager"`). Usa `apps/web/src/components/brand/Brand.tsx` com `logoSrc` preenchido e `size="sidebar"` (`Brand.css`, `.fh-brand[data-size='sidebar']`) — 160px de largura no desktop, reduzindo para 120px (≤1023px) e 96px (≤480px). Participa do fluxo normal do layout (nunca `position: absolute`), alinhada ao canto superior esquerdo por comportamento natural do bloco.
2. **Hero da competência (`HeroBrand.tsx`), desde o Bloco 06, reestruturado no Bloco 15/16:** ocorrência decorativa, pequena, no canto superior esquerdo do card — ver parágrafo abaixo.

Também usada de forma puramente decorativa (`alt=""`) no painel visual da tela de login (`LoginPage.tsx`), dentro de um contêiner já marcado `aria-hidden="true"`.

Cada ocorrência usa sua própria classe CSS (`.fh-brand__logo` na sidebar, `.fh-hero__logo` no hero, `.fh-login-page__logo` no login) — nenhuma delas é compartilhada entre os contextos, mesmo reutilizando o mesmo arquivo de imagem e (no caso da sidebar) o mesmo componente `Brand`.

**Asset legado:** `assets/images/finanhouse-logo-hero.png` (mesmas dimensões, wordmark "Finanhouse") não é mais referenciado por nenhum componente de produção — mantido fisicamente no repositório por ora (histórico/compatibilidade), não excluído nesta rodada. Ver `Docs/02_architecture/decisoes_tecnicas.md`, DT-20 (Status de resolução da pendência visual).

**Tratamento no hero atualizado no Bloco 15 (2026-07-31), posição corrigida no Bloco 16 (2026-08-01):** a logo deixou de ser o elemento estrutural principal do hero (antes ocupava uma coluna própria, com uma superfície clara dedicada atrás dela) e passou a ser um elemento puramente decorativo, pequeno, posicionado no **canto superior esquerdo** do card (`position: absolute`, 150–210px no desktop, reduzindo por breakpoint até 90–120px no mobile — no mobile, `position: static`, no fluxo normal, antes do conteúdo — ver `apps/web/src/components/dashboard/HeroBrand.css`). A implementação original do Bloco 15 usou o canto superior direito; o proprietário esclareceu posteriormente, durante o Bloco 16, que a posição correta sempre foi o canto superior esquerdo — orientação anterior equivocada, corrigida sem reabrir o Bloco 15. Os tokens `--fh-brand-surface`/`--fh-brand-surface-border` foram removidos: por ser genuinamente transparente (RGBA), a imagem não precisa de nenhuma superfície/contêiner atrás dela — ela é exibida diretamente sobre o fundo escuro do card, sem plano de fundo próprio. Em contrapartida, a parte escura do wordmark ("House") fica com contraste reduzido nesse tamanho reduzido sobre fundo escuro; como o uso agora é decorativo (não é mais o conteúdo principal do hero), isso foi aceito conscientemente — ver pendência registrada em `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_15_refinamento_visual_do_hero_da_competencia.md`.

Regras aplicadas:

- A imagem oficial nunca é distorcida, recolorida, cortada ou usada como plano de fundo CSS — sempre um `<img>` semântico com `object-fit: contain`, preservando a proporção original.
- Não foi gerado ícone/glifo substituto para a sidebar; não foi criada uma segunda versão da logo; nenhuma imagem foi editada, cortada ou gerada nos Blocos 15/16 (só CSS/estrutura/componente).
- _Observação histórica resolvida: o asset legado (`finanhouse-logo-hero.png`, não mais em uso) tinha um erro de digitação aparente no slogan ("equiiibrio"). O asset atual (`HouseManager.png`) traz o slogan corretamente grafado ("equilíbrio") — ver seção 8._
- Área de proteção mínima e uma variação compacta (ícone isolado, sem o wordmark completo) para a sidebar seguem **pendentes de definição** — a solução atual reaproveita o lockup completo redimensionado, adequada para o espaço disponível hoje; uma variação compacta oficial dependeria de um arquivo específico, ainda não fornecido.

## 3. Cores

Identidade preta/roxa, sofisticada e minimalista — ver `tokens_design.md` para os valores exatos. Uso pontual (não dominante) de verde/vermelho apenas para diferenciar receita/despesa, sempre acompanhado de texto/ícone (nunca só cor).

| Nome do token | Uso |
|---|---|
| Fundo / superfícies | `--fh-bg`, `--fh-bg-elevated`, `--fh-surface`, `--fh-surface-elevated` — pretos com leve matiz roxo |
| Marca (primária) | `--fh-purple`, `--fh-purple-strong` — CTAs, item de navegação ativo, destaques |
| Texto | `--fh-text`, `--fh-text-secondary`, `--fh-text-muted` |
| Semântica financeira | `--fh-income` (receita, uso pontual), `--fh-expense` (despesa, uso pontual), `--fh-warning` (pendências) |
| Bordas | `--fh-border`, `--fh-border-strong` |

## 4. Tipografia

| Uso | Fonte | Peso | Tamanho |
|---|---|---|---|
| Título de página (`h1`) | `--fh-font-sans` (Inter/system-ui) | 600 | 22px |
| Título de seção (`h2`/`h3`) | `--fh-font-sans` | 600 | 18–20px |
| Corpo | `--fh-font-sans` | 400–500 | 13–15px |
| Legenda / secundário | `--fh-font-sans` | 400–500 | 12–13px |

## 5. Tom Visual

Sofisticado, minimalista e contemporâneo — organização, estabilidade, evolução, equilíbrio doméstico. Na prática:

- Máximo de 2 níveis de elevação por seção (`fh-card` e `fh-card--elevated`), sem sombras pesadas.
- Sem gradientes decorativos além do leve brilho de marca (`--fh-shadow-purple`) em elementos de destaque pontuais.
- Cards com bordas discretas (`--fh-border`), nunca múltiplas bordas empilhadas.
- Sem animação constante — apenas transições curtas em hover/foco, sempre respeitando `prefers-reduced-motion`.
- Ícones consistentes por conceito (mesmo símbolo sempre para o mesmo tipo de dado — ex.: ↑ é sempre receita).

## 6. Regras Obrigatórias

- [x] Nenhuma cor fora da paleta definida em `tokens_design.md` é usada em componentes novos.
- [x] Logo nunca é distorcida, recolorida ou cortada — usada apenas via `<img>` com `object-fit: contain`, sem filtros CSS. Área de proteção mínima formal ainda não definida (ver seção 8).
- [x] Verde/vermelho usados apenas como destaque pontual (receita/despesa), nunca como cor dominante da interface.

## 7. Perguntas Orientadoras

- Se um agente de IA precisasse gerar uma nova tela do zero, esta página teria informação suficiente para a paleta e tipografia saírem corretas de primeira?

## 8. Decisões Pendentes

- P3 — Ainda não existe um arquivo oficial compacto (ícone ou wordmark curto) para uso na `Sidebar`; `Brand.tsx` permanece em modo tipográfico até que esse arquivo específico seja fornecido.
- P3 — Área de proteção mínima e variações formais (claro/escuro) da logo ainda não foram definidas pelo proprietário.
- _P4 resolvida (2026-08-27): o slogan do asset legado (`finanhouse-logo-hero.png`, não mais em uso público) aparentava erro de digitação ("equiiibrio"). O novo asset oficial (`HouseManager.png`, fornecido pelo proprietário) já traz o slogan corretamente grafado — nenhuma ação adicional necessária._
