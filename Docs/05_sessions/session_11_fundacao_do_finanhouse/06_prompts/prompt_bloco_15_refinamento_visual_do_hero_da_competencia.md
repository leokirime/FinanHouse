# Prompt — Bloco 15: Refinamento visual do hero da competência

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_15_refinamento_visual_do_hero_da_competencia.md`
- `Docs/07_design_system/identidade_visual.md` e `Docs/07_design_system/tokens_design.md`

## 2. Objetivo

Corrigir o hero da competência mensal no dashboard: a competência deve ser o elemento principal; a logo vira um elemento decorativo pequeno no canto superior esquerdo, sem coluna nem painel de fundo próprios. _(Posição corrigida durante o Bloco 16 — a versão original deste prompt orientava "canto superior direito"; ver seção 17.)_

## 3. Escopo

Reestruturação de `HeroBrand.tsx`/`.css` (remover grid de duas colunas e `.fh-hero__brand-surface`, reposicionar a logo com `position: absolute`), ajuste de responsividade, remoção dos tokens de design órfãos, atualização de testes e documentação de design system.

## 4. Fora de Escopo

Gerar/editar a imagem da logo; qualquer alteração de domínio, estado, rota, API ou persistência; endpoints HTTP; integração do frontend com a API.

## 5. Arquivos Permitidos

- `apps/web/src/components/dashboard/HeroBrand.tsx`, `HeroBrand.css`, `HeroBrand.test.tsx`
- `apps/web/src/styles/tokens.css`
- `Docs/07_design_system/identidade_visual.md`, `Docs/07_design_system/tokens_design.md`
- Documentos deste bloco/sessão

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não gere nem edite a imagem da logo — apenas CSS/estrutura.
- Não use `mix-blend-mode`/filtros para simular transparência — verificar a transparência real do asset antes de presumir que falta.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Não aplicável — alteração puramente visual, sem entrada de usuário nem dado sensível.

## 8. Restrições de Performance

Não aplicável — mesmo asset já existente, sem novas requisições.

## 9. Restrições de Design System

A logo nunca é distorcida, recolorida, cortada ou usada como plano de fundo CSS — sempre `<img>` semântico com `object-fit: contain`. Qualquer token removido por ficar órfão deve ser removido também de `tokens_design.md`.

## 10. Tarefas

1. Diagnosticar a estrutura atual e o asset de logo (confirmar transparência real via inspeção binária, não só pelo preview visual).
2. Remover o painel/coluna da logo; reposicionar como elemento decorativo absoluto no canto superior esquerdo (150–210px desktop; corrigido no Bloco 16 — ver seção 17).
3. Ajustar responsividade (tablet reduz gradualmente; mobile 90–120px, sem sobreposição, sem rolagem horizontal).
4. Remover tokens órfãos e atualizar a documentação de design system.
5. Atualizar/criar testes; validar build/lint/typecheck/test/DDAE.
6. Documentar, revisar segurança, commit, push, merge.

## 11. Critérios de Aceite

- [x] Competência é o elemento principal; logo é decorativa, sem coluna/painel próprios.
- [x] Responsivo em desktop/tablet/mobile, sem sobreposição.
- [x] Nenhuma regra funcional alterada.

## 12. Validações Locais Obrigatórias

- [x] `ddae-engine validate`
- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `test`
- [x] `ddae-engine audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_15_refinamento_visual_do_hero_da_competencia --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Status: Aprovado — build/lint/typecheck/test/DDAE aprovados, 661 testes (254 api / 254 web / 153 domain), 0 P1/P2 novas.

## 15. Commit Semântico Sugerido

```
fix(web): reposicionar marca no hero da competência
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.

## 17. Correção Retrospectiva (aplicada durante o Bloco 16, 2026-07-31)

Este prompt originalmente orientava posicionar a logo no canto superior **direito** — orientação incorreta, esclarecida pelo proprietário durante o Bloco 16. A posição correta é o canto superior **esquerdo**. A correção foi aplicada como parte do trabalho do Bloco 16 (commit `fix(web): posicionar marca no canto superior esquerdo`), sem reabrir este bloco nem reescrever os commits já publicados do Bloco 15.
