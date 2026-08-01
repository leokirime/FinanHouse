# Bloco 15 — Refinamento visual do hero da competência

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Objetivo

Corrigir o hero da competência mensal no dashboard para que a movimentação seja o elemento principal e a logo vire um elemento decorativo pequeno no canto superior esquerdo, sem coluna própria nem painel de fundo. _(Posição corrigida durante o Bloco 16 — ver seção 18. A implementação original deste bloco usou o canto superior direito.)_

## 2. Contexto

Correção visual pontual solicitada entre o Bloco 14 (repositórios Drizzle reais) e o próximo bloco funcional (endpoints HTTP). Não decorre de um requisito funcional novo — é um ajuste de UX sobre um componente já existente desde o Bloco 06 (`HeroBrand`).

## 3. Problema que Este Bloco Resolve

A imagem da marca (`HeroBrand.tsx`) era tratada como coluna estrutural principal: `.fh-hero` usava um grid de duas colunas (`3fr`/`2fr`) e `.fh-hero__brand-surface` envolvia a logo com um painel de fundo quase-branco (`--fh-brand-surface: #f4f1f8`), borda e sombra — ocupando ~40% da seção (até 640px) e criando um grande retângulo claro dentro de um dashboard de identidade escura.

## 4. Escopo

- Remover a estrutura em duas colunas e o painel `.fh-hero__brand-surface`.
- Reposicionar a logo como elemento decorativo (`position: absolute`, canto superior esquerdo — corrigido no Bloco 16, ver seção 18 —, 150–210px no desktop).
- Ajustar responsividade (tablet reduz gradualmente; mobile 90–120px, sem sobreposição, sem rolagem horizontal).
- Remover os tokens de design órfãos (`--fh-brand-surface`, `--fh-brand-surface-border`).
- Atualizar testes do `HeroBrand` e a documentação de identidade visual/tokens.

## 5. Fora de Escopo

- Gerar ou editar a imagem da logo.
- Qualquer alteração de regra de domínio, estado, rota, API ou persistência.
- Endpoints HTTP / integração do frontend com a API (próximo bloco funcional).

## 6. Arquivos e Pastas Envolvidos

- `apps/web/src/components/dashboard/HeroBrand.tsx`
- `apps/web/src/components/dashboard/HeroBrand.css`
- `apps/web/src/components/dashboard/HeroBrand.test.tsx`
- `apps/web/src/styles/tokens.css`
- `Docs/07_design_system/identidade_visual.md`, `Docs/07_design_system/tokens_design.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md` e os documentos deste bloco

## 7. Dependências

Nenhuma — ajuste isolado sobre um componente já existente, sem dependência de blocos futuros.

## 8. Plano de Implementação

1. Diagnosticar a estrutura atual (`HeroBrand.tsx`/`.css`) e o asset de logo disponível.
2. Confirmar via inspeção binária do PNG se ele tem transparência real (não presumir pelo preview visual).
3. Remover o painel/coluna da logo; reposicionar como elemento absoluto decorativo.
4. Ajustar breakpoints de responsividade.
5. Remover tokens órfãos; atualizar documentação de design system.
6. Atualizar/criar testes; validar build/lint/typecheck/test/DDAE.
7. Documentar, revisar segurança, commit, push, merge.

## 9. Critérios de Aceite

- [x] A competência mensal é o elemento visualmente principal do hero.
- [x] A logo não ocupa mais uma coluna própria nem tem painel de fundo.
- [x] A logo fica no canto superior esquerdo (corrigido no Bloco 16 — ver seção 18), 150–210px no desktop.
- [x] Título, descrição, status e botões preservados sem alteração de comportamento.
- [x] Responsivo em desktop/tablet/mobile, sem sobreposição nem rolagem horizontal.
- [x] Nenhuma regra financeira, estado, rota, API ou persistência alterada.

## 10. Validações Obrigatórias

- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `test`
- [x] `npx ddae-engine validate` / `npx ddae-engine audit`

## 11. Segurança

Não aplicável — alteração puramente visual (CSS/estrutura de componente), sem entrada de usuário, autenticação ou dado sensível envolvido.

## 12. Performance

Não aplicável — mesmo asset de imagem já existente, sem novas requisições nem processamento adicional; bundle de CSS praticamente inalterado.

## 13. Design System / UX

Remove os tokens `--fh-brand-surface`/`--fh-brand-surface-border` (`Docs/07_design_system/tokens_design.md`) e atualiza o tratamento da logo no hero documentado em `Docs/07_design_system/identidade_visual.md`, seção 2.

## 14. Riscos

- A imagem oficial tem uma parte de texto escura ("Finan"); em tamanho decorativo pequeno sobre fundo escuro, o contraste dessa parte é reduzido — aceito conscientemente por ser um uso decorativo, não o conteúdo principal (registrado em `identidade_visual.md`).

## 15. Pendências Esperadas

- P4: se o Finanhouse algum dia tiver uma variação compacta oficial da marca (ícone isolado), ela substituiria com vantagem o recorte atual do lockup completo — não bloqueia este bloco.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_15_refinamento_visual_do_hero_da_competencia --session session_11_fundacao_do_finanhouse` — ver `08_feedbacks/feedback_bloco_15_refinamento_visual_do_hero_da_competencia.md`.

## 17. Commit Semântico Sugerido

```
fix(web): reposicionar marca no hero da competência
```

## 18. Correção Retrospectiva (aplicada durante o Bloco 16, 2026-07-31)

A implementação original deste bloco (commits `9ab913e`/`17fb9ba`) posicionou a logo no **canto superior direito**, seguindo a orientação fornecida naquele momento. Durante o desenvolvimento do Bloco 16, o proprietário esclareceu que a posição desejada sempre foi o **canto superior esquerdo** — orientação anterior incorreta, não uma mudança de requisito. A correção foi incorporada ao trabalho do Bloco 16 (sem reabrir um bloco novo, sem reescrever os commits já publicados do Bloco 15): `.fh-hero__logo` passou de `right` para `left`; `.fh-hero__info` passou a usar `margin-left` (não apenas `max-width`) para se deslocar para a direita da logo; no mobile, a logo deixou de ser `position: absolute` e passou a `position: static`, no fluxo normal, antes do conteúdo. O painel branco removido neste bloco **continua removido**; o asset (`assets/images/finanhouse-logo-hero.png`) **não foi alterado**; nenhuma regra funcional foi tocada. Commit da correção: `fix(web): posicionar marca no canto superior esquerdo` (branch do Bloco 16).
