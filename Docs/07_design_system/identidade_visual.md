# Identidade Visual

> Projeto: FinanHouse · Atualizado em: 2026-07-31

> Este documento existe para que um agente de IA gerando UI não "invente" cores, fontes ou logo — ele consulta aqui primeiro.

## 1. Objetivo

Definir a identidade visual de forma específica o suficiente para que qualquer pessoa ou agente produza UI visualmente consistente sem supervisão constante.

## 2. Logo

**A logo oficial foi adicionada ao repositório e integrada ao hero.** Arquivo: `assets/images/finanhouse-logo-hero.png` (PNG, 1536×1024, RGBA com canal alfa real — confirmado por inspeção binária do arquivo, não apenas pela extensão) — composição horizontal completa (ícone de casa + wordmark "Finanhouse" + slogan "Casa, evolução e equilíbrio"), destinada especificamente ao hero do dashboard (`apps/web/src/components/dashboard/HeroBrand.tsx`).

**Ainda não existe um arquivo oficial compacto específico para a sidebar.** Por isso `apps/web/src/components/brand/Brand.tsx` (usado na `Sidebar`) continua em **modo tipográfico** — apenas o texto "Finanhouse" estilizado (gradiente texto de `--fh-text` para `--fh-purple-strong`). A imagem do hero é uma composição larga com slogan, não recortável em um ícone compacto sem redesenhar a marca — o que não foi autorizado.

**Tratamento no hero atualizado no Bloco 15 (2026-07-31):** a logo deixou de ser o elemento estrutural principal do hero (antes ocupava uma coluna própria, com uma superfície clara dedicada atrás dela) e passou a ser um elemento puramente decorativo, pequeno, posicionado no canto superior direito do card (`position: absolute`, 150–210px no desktop, reduzindo por breakpoint até 90–120px no mobile — ver `apps/web/src/components/dashboard/HeroBrand.css`). Os tokens `--fh-brand-surface`/`--fh-brand-surface-border` foram removidos: por ser genuinamente transparente (RGBA), a imagem não precisa de nenhuma superfície/contêiner atrás dela — ela é exibida diretamente sobre o fundo escuro do card, sem plano de fundo próprio. Em contrapartida, a parte escura do wordmark ("Finan") fica com contraste reduzido nesse tamanho reduzido sobre fundo escuro; como o uso agora é decorativo (não é mais o conteúdo principal do hero), isso foi aceito conscientemente — ver pendência registrada em `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_15_refinamento_visual_do_hero_da_competencia.md`.

Regras aplicadas:

- A imagem oficial nunca é distorcida, recolorida, cortada ou usada como plano de fundo CSS — sempre um `<img>` semântico com `object-fit: contain`, preservando a proporção original.
- Não foi gerado ícone/glifo substituto para a sidebar; não foi criada uma segunda versão da logo; nenhuma imagem foi editada ou gerada no Bloco 15 (só CSS/estrutura).
- Observação registrada (não corrigida — arquivo original não foi alterado): o slogan embutido na imagem aparenta ter um erro de digitação ("equiiibrio" em vez de "equilíbrio"). Ver seção 8.
- Área de proteção mínima e uma variação compacta (ícone/completo) para a sidebar seguem **pendentes de definição** — dependem de um arquivo oficial específico para esse uso, ainda não fornecido.

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
- P4 — O slogan embutido em `assets/images/finanhouse-logo-hero.png` aparenta conter um erro de digitação ("equiiibrio"). O arquivo não foi alterado (fora de escopo modificar o asset); registrar para o proprietário decidir se substitui o arquivo.
