# Bloco 15 — Refinamento visual do hero da competência

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Objetivo

Corrigir o hero da competência mensal no dashboard para que a movimentação seja o elemento principal e a logo vire um elemento decorativo pequeno no canto superior direito, sem coluna própria nem painel de fundo.

## 2. Contexto

Correção visual pontual solicitada entre o Bloco 14 (repositórios Drizzle reais) e o próximo bloco funcional (endpoints HTTP). Não decorre de um requisito funcional novo — é um ajuste de UX sobre um componente já existente desde o Bloco 06 (`HeroBrand`).

## 3. Problema que Este Bloco Resolve

A imagem da marca (`HeroBrand.tsx`) era tratada como coluna estrutural principal: `.fh-hero` usava um grid de duas colunas (`3fr`/`2fr`) e `.fh-hero__brand-surface` envolvia a logo com um painel de fundo quase-branco (`--fh-brand-surface: #f4f1f8`), borda e sombra — ocupando ~40% da seção (até 640px) e criando um grande retângulo claro dentro de um dashboard de identidade escura.

## 4. Escopo

- Remover a estrutura em duas colunas e o painel `.fh-hero__brand-surface`.
- Reposicionar a logo como elemento decorativo (`position: absolute`, canto superior direito, 150–210px no desktop).
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
- [x] A logo fica no canto superior direito, 150–210px no desktop.
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
