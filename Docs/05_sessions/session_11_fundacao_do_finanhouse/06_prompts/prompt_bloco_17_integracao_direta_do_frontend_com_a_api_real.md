# Prompt — Bloco 17: Integração direta do frontend com a API real

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_17_integracao_direta_do_frontend_com_a_api_real.md`
- `Docs/03_contracts/contrato_api_http.md` (Bloco 16) e `Docs/02_architecture/estado_temporario_frontend.md`

## 2. Objetivo

Cortar diretamente do modo demonstrativo para a API HTTP real (Bloco 16) — sem modo híbrido, sem seletor demo/real, sem fallback silencioso.

## 3. Escopo

Cliente HTTP do frontend; `FinanceProvider` real; migração de Dashboard/Movimentações/Comparativo/Histórico/Planejamento; Planejamento com movimentações reais (sem limite por categoria); bootstrap estrutural permanente do household inicial; remoção do modo demonstrativo do runtime.

## 4. Fora de Escopo

Autenticação real; persistência de limites por categoria; nova migration; seed genérico; deploy; endpoints de escrita para `users`/`households`.

## 5. Arquivos Permitidos

- `apps/web/src/api/**`, `apps/web/src/state/**`, `apps/web/src/hooks/**`, `apps/web/src/pages/**`, `apps/web/src/components/**`
- `apps/web/src/App.tsx`, `main.tsx`, `test-utils.tsx`, `vite-env.d.ts`
- `apps/api/scripts/db-bootstrap-household.ts`, `apps/api/src/db/household-bootstrap-*.ts`
- `apps/api/package.json`, `package.json` (raiz)
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_frontend_backend.md`, `Docs/02_architecture/estado_temporario_frontend.md`, `Docs/01_product/requisitos_funcionais.md`
- `README.md`, `apps/web/README.md`, `apps/api/README.md`, documentos deste bloco/sessão

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem necessidade real (nenhuma foi adicionada neste bloco).
- Checkpoint humano obrigatório antes de qualquer escrita real (bootstrap estrutural).
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

API sem autenticação real permanece; bind local, CORS restrito (herdados do Bloco 16). Household nunca hardcoded — resolvido por `VITE_FINANHOUSE_HOUSEHOLD_ID` local, nunca commitado. Bootstrap estrutural exige `CONFIRM_HOUSEHOLD_BOOTSTRAP=true` e autorização explícita; nunca imprime nome/e-mail em log.

## 8. Restrições de Performance

Não aplicável — API e frontend locais, dataset pessoal pequeno.

## 9. Restrições de Design System

Reaproveitar tokens/componentes existentes; nenhuma nova identidade visual introduzida além da tela de status de carregamento/erro.

## 10. Tarefas

1. Diagnóstico inicial e inspeção obrigatória.
2. Registrar DT-12.
3. Implementar cliente HTTP e `FinanceProvider`.
4. Migrar as cinco páginas funcionais.
5. Remover modo demonstrativo do runtime; portar para `state/test-support/`.
6. Implementar bootstrap estrutural + guards + testes.
7. Validar localmente; pré-flight; checkpoint; aguardar autorização.
8. Executar bootstrap autorizado; auditar; configurar `.env.local`; validar funcionalmente.
9. Documentar; criar feedback DDAE.
10. Validações finais, revisão de segurança, commit, push, merge.

## 11. Critérios de Aceite

- [x] Nenhum fallback demonstrativo em runtime.
- [x] Cinco páginas migradas, Planejamento com movimentações reais.
- [x] Mutações aguardam resposta HTTP; duplo envio impedido.
- [x] Bootstrap estrutural autorizado e executado.

## 12. Validações Locais Obrigatórias

- [x] `ddae-engine validate`
- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`
- [x] `ddae-engine audit`
- [x] `npm audit --omit=dev`
- [x] Pré-flight somente leitura do banco (`db:check`, audits) antes do checkpoint

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_17_integracao_direta_do_frontend_com_a_api_real --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Status: Aprovado — bootstrap estrutural autorizado (`AUTORIZO BOOTSTRAP INICIAL FINANHOUSE_DEV`) e executado com sucesso; validação funcional local (API + frontend reais) aprovada, com um bug real de contrato (`PUT` de competência sem corpo) descoberto e corrigido; 761 testes preservados/novos aprovados.

## 15. Commit Semântico Sugerido

```
feat(web): integrar frontend com API financeira real
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
