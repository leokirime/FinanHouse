# Prompt — Bloco 02: Inventário seguro do banco existente

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_02_inventario_seguro_do_banco_existente.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Conectar de forma controlada e somente leitura ao MySQL já existente na Clever Cloud, documentar sua estrutura atual e produzir evidências suficientes para decidir a estratégia de acesso, modelagem e migrations, sem alterar o banco.

## 3. Escopo

Preparar conexão segura; instalar `mysql2`; ler variáveis de ambiente; validar configuração sem imprimir valores; testar conectividade; identificar versão/banco ativo; listar tabelas, colunas, chaves, índices, engines, collations; estimar registros via metadados; documentar o estado encontrado; registrar riscos/divergências; propor (não decidir) próximos passos de ORM/migrations.

## 4. Fora de Escopo

Ler conteúdo financeiro ou pessoal das linhas; INSERT/UPDATE/DELETE/CREATE/ALTER/DROP/TRUNCATE; migrations; seeds; autenticação; endpoints financeiros; ORM definitivo; dashboard; deploy; backup/restauração; alteração de permissões do banco.

## 5. Arquivos Permitidos

- `apps/api/package.json` (adicionar `mysql2`)
- `apps/api/.env.local` (criar vazio, nunca commitado)
- `.env.example` (nomes de variáveis, sem valores)
- `database/inspection/inspect-database.ts`, `database/inspection/README.md`
- `database/current-schema/*.md`
- Não tocar em `apps/web/**`, `Docs/03_contracts/contrato_banco_dados.md` (leitura apenas), ou qualquer arquivo fora desta lista sem reportar antes

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Credenciais nunca em código, commit, log ou saída de terminal/chat. Nenhuma conexão antes de confirmação explícita do proprietário. Allowlist fixa de consultas somente leitura (`SELECT 1`, `SELECT VERSION()`, `SELECT DATABASE()`, `SHOW TABLES`, `SHOW CREATE TABLE`, `information_schema.tables/columns/statistics/key_column_usage/referential_constraints`) — nunca aceitar SQL arbitrário vindo de argumento, terminal, endpoint ou entrada externa. Erros de conexão não podem expor string de conexão, senha ou host completo.

## 8. Restrições de Performance

Timeout de conexão curto (`DATABASE_CONNECT_TIMEOUT`, default 10000ms). Fechar conexão/pool corretamente ao final — não manter conexão persistente desnecessária.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Instalar `mysql2` em `apps/api` (driver técnico apenas).
2. Atualizar `.env.example` e criar `apps/api/.env.local` vazio; confirmar `.gitignore`.
3. Criar `database/inspection/inspect-database.ts` com a allowlist de consultas.
4. **Parar** e pedir ao proprietário para preencher `apps/api/.env.local` manualmente — aguardar a resposta exata "credenciais preenchidas" antes de continuar.
5. Após confirmação: validar presença/formato das variáveis (sem imprimir valores), testar conectividade, executar as consultas da allowlist, documentar o resultado sanitizado em `database/current-schema/`.

## 11. Critérios de Aceite

- [ ] `mysql2` instalado como driver técnico (sem ORM)
- [ ] `apps/api/.env.local` existe, vazio, ignorado pelo Git
- [ ] Execução parou antes da primeira conexão, aguardando confirmação do proprietário
- [ ] Nenhum valor de credencial impresso em qualquer saída
- [ ] Inventário documentado sem dados sensíveis
- [ ] Nenhuma alteração estrutural/de dados no banco

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_02_inventario_seguro_do_banco_existente --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(inventario_seguro_do_banco_existente): _..._
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
