# Prompt — Bloco 11: Migração da infraestrutura MySQL para Aiven

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_11_migracao_da_infraestrutura_mysql_para_aiven.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Preparar código e arquitetura do Finanhouse para o Aiven for MySQL (configuração centralizada, TLS estrito, separação dev/prod, scripts protegidos), sem conectar ao banco real, sem aplicar migrations e sem receber nenhuma credencial.

## 3. Escopo

Módulo de configuração central e puro; resolução de CA por caminho ou Base64; TLS estrito; factory de pool `mysql2` sob demanda; scripts `db:check`/`db:migrate`/`db:seed:dev` reais porém não executados; `.env.example`/`.gitignore` atualizados; ~43 testes automatizados; documentação (DT-07, contratos, READMEs, reconciliação da P2 dos Blocos 03/04). Ver detalhamento completo em `05_blocks/bloco_11_migracao_da_infraestrutura_mysql_para_aiven.md`, seção 4.

## 4. Fora de Escopo

Qualquer conexão real com o Aiven, aplicação de migration, execução de seed, preenchimento de `apps/api/.env.local`, qualquer feature de produto, alteração de layout, remoção de teste existente, `npm audit fix`/`npm audit fix --force`, instalação de MySQL local, merge à `main`, exclusão de branch, criação de um novo bloco após este.

## 5. Arquivos Permitidos

- `apps/api/src/config/**`, `apps/api/src/db/pool.ts` (+ teste), `apps/api/scripts/**`, `apps/api/tsconfig.scripts.json`
- `apps/api/package.json`, `package.json` (raiz), `.env.example`, `.gitignore`
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_banco_dados.md`, `Docs/03_contracts/contrato_variaveis_ambiente.md`, `Docs/01_product/requisitos_funcionais.md`
- `README.md` (raiz), `apps/api/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- Arquivos DDAE da própria sessão/bloco (`05_blocks/`, `06_prompts/`, `08_feedbacks/`)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Ver as restrições de segurança verbatim do prompt original do proprietário, reproduzidas integralmente em `05_blocks/bloco_11_migracao_da_infraestrutura_mysql_para_aiven.md`, seção 11: nunca ler/exibir `apps/api/.env.local`; nunca solicitar senha, host, porta ou Service URI; nunca conectar ao Aiven; nunca aplicar migration ou seed; nunca usar `drizzle-kit push`; `rejectUnauthorized` sempre `true`; nenhum certificado versionado; toda validação falha antes de qualquer conexão.

## 8. Restrições de Performance

Não aplicável — nenhum código deste bloco roda em runtime de produção nesta etapa; pool criado sob demanda, não por requisição.

## 9. Restrições de Design System

Não aplicável — nenhuma alteração de interface.

## 10. Tarefas

1. Verificar estado real do repositório antes de qualquer alteração.
2. Criar branch, bloco e prompt DDAE oficiais.
3. Inspecionar estrutura existente antes de escrever código novo.
4. Implementar módulo de configuração central, resolução de CA e testes.
5. Implementar factory de pool com TLS estrito e teste.
6. Implementar os três scripts de banco e o sanitizador de erro compartilhado.
7. Atualizar `package.json`, `.env.example`, `.gitignore`.
8. Atualizar documentação e reconciliar a P2 dos Blocos 03/04.
9. Gerar e preencher o feedback DDAE.
10. Rodar a suíte completa de validações.
11. Revisão de segurança pré-commit.
12. Commit e push apenas da branch (sem merge, sem push a `main`).

## 11. Critérios de Aceite

- [x] Nenhuma conexão real, migration ou seed executada.
- [x] Nenhuma credencial solicitada, lida ou exibida.
- [x] TLS estrito garantido por teste; sem `checkServerIdentity` override.
- [x] Suíte de testes anterior preservada + novos testes passando (492 no total).
- [x] `mysql2`/`drizzle-orm`/`drizzle-kit`/`react-router@8.3.0` preservados; `react-router-dom` ausente.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `ddae-engine audit`
- [x] `npm run build`, `npm run lint`, `npm run typecheck`, `npm run typecheck:api-scripts`, `npm run test`
- [x] `npm run verify:runtime`
- [x] `npm audit --omit=dev` (0 vulnerabilidades), `npm audit` (4 moderadas, dev only)

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_11_migracao_da_infraestrutura_mysql_para_aiven --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
refactor(database): preparar infraestrutura MySQL para Aiven
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
