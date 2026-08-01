# Feedback — Bloco 15: Refinamento visual do hero da competência

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-01

## 1. Resumo Executivo

O hero da competência mensal (`HeroBrand.tsx`) usava um grid de duas colunas em que a logo, envolvida por um painel `.fh-hero__brand-surface` (fundo quase-branco `#f4f1f8`, borda, sombra), ocupava ~40% da seção — o "grande retângulo branco" relatado. Corrigido removendo o grid e o painel; a logo agora é um elemento decorativo `position: absolute` no canto superior esquerdo (150–210px desktop, reduzindo por breakpoint até 90–120px no mobile), e a competência (título, descrição, status, ação) passa a ser o único conteúdo em fluxo normal, deslocado para a direita da logo. Durante o diagnóstico, uma suposição inicial errada (a imagem teria fundo opaco embutido, exigindo um asset alternativo) foi corrigida por inspeção binária direta do PNG: o arquivo tem canal alfa real (RGBA), então a imagem existente já era adequada — o problema era inteiramente estrutural (o painel), não do asset. Os tokens de design órfãos (`--fh-brand-surface`/`--fh-brand-surface-border`) foram removidos. Nenhuma regra funcional, estado, rota, API ou dado foi alterado. **Nota:** a posição original implementada foi o canto superior direito; corrigida para o canto superior esquerdo durante o Bloco 16, após esclarecimento do proprietário — ver seção 19.

## 2. Objetivo do Bloco

Corrigir o hero da competência mensal no dashboard para que a movimentação seja o elemento principal e a logo vire um elemento decorativo pequeno no canto superior esquerdo, sem coluna própria nem painel de fundo. _(Ver seção 19 — a posição foi corrigida de direito para esquerdo durante o Bloco 16.)_

## 3. Escopo Implementado

- Remoção do grid de duas colunas (`.fh-hero`) e do painel `.fh-hero__brand-surface`.
- Logo reposicionada com `position: absolute`, canto superior esquerdo (corrigido no Bloco 16 — ver seção 19), `clamp(150px, 18vw, 210px)` no desktop.
- Responsividade ajustada: tablet (`clamp(130px, 16vw, 170px)`) e mobile (`clamp(90px, 28vw, 120px)`, com `padding-top` no conteúdo para evitar sobreposição).
- Remoção dos tokens `--fh-brand-surface`/`--fh-brand-surface-border` de `tokens.css`.
- Atualização de `Docs/07_design_system/identidade_visual.md` e `tokens_design.md`.
- 3 testes novos em `HeroBrand.test.tsx`.

Não implementado (fora de escopo, conforme o prompt): geração/edição de imagem; qualquer mudança de domínio, estado, rota, API ou persistência.

## 4. Arquivos Criados

Nenhum — apenas alteração de arquivos existentes.

## 5. Arquivos Alterados

- `apps/web/src/components/dashboard/HeroBrand.tsx`
- `apps/web/src/components/dashboard/HeroBrand.css`
- `apps/web/src/components/dashboard/HeroBrand.test.tsx`
- `apps/web/src/styles/tokens.css`
- `Docs/07_design_system/identidade_visual.md`
- `Docs/07_design_system/tokens_design.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`, `05_blocks/bloco_15_...md`, `06_prompts/prompt_bloco_15_...md`

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
git switch -c fix/session-11-hero-competencia-logo
npx ddae-engine block create "Refinamento visual do hero da competência" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_15_refinamento_visual_do_hero_da_competencia --session session_11_fundacao_do_finanhouse
node -e "... inspeção binária do PNG (IHDR + decodificação de scanlines + amostragem de alpha) ..."
npm run build / verify:runtime / lint / typecheck / test
npx ddae-engine validate / audit
npx ddae-engine feedback create --block bloco_15_refinamento_visual_do_hero_da_competencia --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- 3 testes novos: ausência do painel `.fh-hero__brand-surface` no DOM; a imagem carrega a classe `fh-hero__logo`; descrição da competência exibida junto do título/status.
- Suíte web completa: 254 testes (251 + 3 novos), todos verdes, incluindo os 6 testes pré-existentes do `HeroBrand` (imagem com alt correto, sem background-image CSS, sem duplicar o slogan como texto, competência/status exibidos, CTA desabilitado, sem URL externa/base64).
- Verificação binária do PNG (`node -e`, decodificação manual de IHDR + scanlines + Paeth/Up/Sub/Average unfilter): confirmado `colorType: 6` (RGBA) e alpha real de 0 nos cantos (transparente) vs. ~254 no centro (opaco onde está o desenho) — não um artefato do visualizador.
- Visualização manual do frontend não realizada por mim neste bloco (sem ferramenta de browser/screenshot disponível no ambiente) — servidor de desenvolvimento iniciado para o proprietário conferir.

## 9. Validações Executadas

- `ddae-engine validate`: OK, 0 warnings/erros.
- `ddae-engine audit`: OK, apenas os 7 quality gates pendentes (mais o feedback deste bloco, resolvido por este próprio documento) — 0 pendências P1/P2.
- `npm run build` / `verify:runtime` / `lint` / `typecheck` / `test`: todos aprovados.

## 10. Decisões Técnicas

Nenhuma decisão cara de reverter — ajuste de CSS/estrutura sobre um componente existente, sem impacto arquitetural. Registrado apenas em `Docs/07_design_system/identidade_visual.md` (não em `decisoes_tecnicas.md`, por não se qualificar como decisão técnica cara de reverter).

## 11. Problemas Encontrados

1. **Suposição inicial incorreta sobre o asset:** ao visualizar o PNG pela ferramenta de leitura, a imagem aparentava ter um fundo cinza gradiente opaco embutido — o que levaria à conclusão (prevista como cenário possível no prompt) de que não havia asset transparente disponível. Antes de agir sobre essa suposição, o arquivo foi decodificado byte a byte (chunk IHDR + inflate dos chunks IDAT + reversão dos filtros PNG por scanline) para confirmar a real presença de canal alfa. Resultado: `colorType: 6` (RGBA), com alpha `0` nos cantos e `~254` apenas onde está o desenho — ou seja, a imagem sempre foi transparente; o "fundo cinza" era só o modo como a ferramenta de visualização compõe transparência sobre um fundo neutro para exibição. Sem essa verificação, o bloco poderia ter concluído erroneamente que faltava um asset e escalado essa lacuna desnecessariamente.

## 12. Correções Aplicadas Durante o Bloco

Nenhuma correção de rota — a suposição errada (item 11) foi identificada e corrigida antes de qualquer implementação, não depois.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._

### P3 — Melhoria Recomendada

Nenhuma.

### P4 — Opcional

- Se o Finanhouse algum dia tiver uma variação compacta oficial da marca (ícone isolado, sem o wordmark completo), ela substituiria com vantagem o recorte atual do lockup completo usado na decoração do hero — não bloqueia este bloco.
- A parte escura do wordmark ("Finan") tem contraste reduzido no tamanho decorativo pequeno sobre fundo escuro — aceitável por ser um uso decorativo (não o conteúdo principal), mas vale reavaliar se um dia a marca ganhar uma variação com texto mais claro.

## 14. Riscos Restantes

Nenhum risco novo. Verificação manual do resultado visual no navegador fica a cargo do proprietário (sem ferramenta de screenshot/browser disponível para mim neste ambiente).

## 15. Evidências

- `npm run test` (web): 254 testes aprovados, incluindo os 3 novos deste bloco.
- Saída da inspeção binária do PNG: `{ width: 1536, height: 1024, bitDepth: 8, colorType: 6 }` → `RGBA`; amostras de alpha nos quatro cantos = `0` (transparente); alpha no centro = `254` (opaco).
- `ddae-engine audit`: 0 pendências P1/P2 antes e depois deste bloco.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

## 17. Próximo Bloco Recomendado

Não iniciar automaticamente — o próximo passo funcional é a criação dos endpoints HTTP sobre os repositórios reais (Bloco 14, DT-10), conforme instrução explícita de não começar o próximo bloco funcional neste momento.

## 18. Commit Semântico Sugerido

```
fix(web): reposicionar marca no hero da competência
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._

## 19. Correção Retrospectiva (aplicada durante o Bloco 16, 2026-08-01)

A implementação original deste bloco (commits `9ab913e`/`17fb9ba`, já publicados em `main`) posicionou a logo no **canto superior direito**, seguindo a orientação recebida naquele momento. Durante o desenvolvimento do Bloco 16, o proprietário esclareceu que a posição correta sempre foi o **canto superior esquerdo** — uma orientação anterior incorreta, não uma mudança de requisito funcional. A correção foi incorporada ao trabalho do Bloco 16 (sem reabrir este bloco, sem reescrever os commits `9ab913e`/`17fb9ba` já publicados):

- `.fh-hero__logo`: `right` → `left`.
- `.fh-hero__info`: passou a usar `margin-left` (além de `max-width`) para se deslocar corretamente para a direita da logo.
- Mobile: a logo deixou de usar `position: absolute` e passou a `position: static`, no fluxo normal, antes do conteúdo — simplificação que também eliminou a necessidade do `padding-top` usado na primeira versão.
- 7 testes novos em `HeroBrand.test.tsx`, incluindo leitura controlada do CSS para confirmar que a regra de `.fh-hero__logo` usa `left` e nenhum bloco do arquivo usa `right` para a logo.

O painel branco removido neste bloco **continua removido**; o asset (`assets/images/finanhouse-logo-hero.png`) **não foi alterado nem regenerado**; nenhuma regra funcional, estado, rota, API ou persistência foi tocada. Commit da correção: `fix(web): posicionar marca no canto superior esquerdo` (branch `feat/session-11-bloco-16-api-http-financeira`, integrado junto do Bloco 16).
