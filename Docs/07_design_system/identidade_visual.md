# Identidade Visual

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Este documento existe para que um agente de IA gerando UI não "invente" cores, fontes ou logo — ele consulta aqui primeiro.

## 1. Objetivo

Definir a identidade visual de forma específica o suficiente para que qualquer pessoa ou agente produza UI visualmente consistente sem supervisão constante.

## 2. Logo

**Status atual (Bloco 06): logo oficial ainda não existe em `assets/brand/`.** Enquanto isso, todo componente que precisar exibir a marca usa `apps/web/src/components/brand/Brand.tsx` em **modo tipográfico** — apenas o texto "Finanhouse" estilizado (gradiente texto de `--fh-text` para `--fh-purple-strong`), sem ícone ou marca substituta inventada.

`Brand.tsx` já está preparado para a logo oficial: aceita uma prop `logoSrc` opcional; quando um arquivo existir em `assets/brand/` e for referenciado por essa prop, o componente passa a renderizar a imagem (`<img>`) em vez do texto, sem que nenhum outro componente precise mudar. Até lá:

- Não gerar ícone/glifo substituto.
- Não redesenhar ou aproximar uma logo "provisória".
- Área de proteção mínima e variações (claro/escuro, ícone/completo) ficam **pendentes de definição** junto com a logo real — ver seção 8.

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
- [ ] Logo nunca é distorcido, recolorido fora das variações aprovadas, ou usado abaixo da área de proteção mínima — **pendente até a logo oficial existir** (ver seção 8).
- [x] Verde/vermelho usados apenas como destaque pontual (receita/despesa), nunca como cor dominante da interface.

## 7. Perguntas Orientadoras

- Se um agente de IA precisasse gerar uma nova tela do zero, esta página teria informação suficiente para a paleta e tipografia saírem corretas de primeira?

## 8. Decisões Pendentes

- P3 — Logo oficial do Finanhouse ainda não está em `assets/brand/`. Quando disponível: adicionar o arquivo, definir variações (claro/escuro, ícone/completo) e área de proteção mínima, e passar `logoSrc` para `Brand.tsx` (nenhuma outra mudança de componente deve ser necessária).
