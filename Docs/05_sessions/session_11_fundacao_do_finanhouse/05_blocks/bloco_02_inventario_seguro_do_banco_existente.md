# Bloco 02 — Inventário seguro do banco existente

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Conectar de forma controlada e somente leitura ao MySQL já existente na Clever Cloud, documentar sua estrutura atual e produzir evidências suficientes para decidir a estratégia de acesso, modelagem e migrations, sem alterar o banco.

## 2. Contexto

O Bloco 01 (bootstrap técnico do monorepo) foi concluído, aprovado, commitado (`7e84e0c`) e enviado a `origin/main`. O MySQL do Finanhouse já existe na Clever Cloud (ver `Docs/03_contracts/contrato_banco_dados.md` e `Docs/02_architecture/decisoes_tecnicas.md`, seção 5) e é tratado como não descartável e potencialmente contendo estrutura ou dados, ainda não inspecionados. Este bloco é o inventário somente leitura que faltava para poder tomar a decisão pendente de ORM/driver.

## 3. Problema que Este Bloco Resolve

Sem saber o que já existe no banco (tabelas, colunas, relacionamentos, dados), qualquer decisão de modelagem, ORM ou migration corre o risco de colidir com estrutura real ou presumir um banco vazio que não é. Este bloco resolve essa incerteza com uma inspeção segura e documentada.

## 4. Escopo

- Preparar conexão segura (driver `mysql2`, leitura de variáveis de ambiente)
- Validar configuração sem imprimir valores
- Testar conectividade
- Identificar versão do MySQL e banco ativo
- Listar tabelas, colunas e tipos
- Listar chaves primárias, estrangeiras e índices
- Identificar engines e collations
- Obter estimativa de registros por tabela via metadados (`information_schema`)
- Documentar o estado encontrado em `database/current-schema/`
- Registrar riscos e divergências
- Propor próximos passos (análise comparativa de ORM/driver, como proposta, não decisão final)

## 5. Fora de Escopo

- Ler conteúdo financeiro dos registros ou dados pessoais
- Qualquer `INSERT`/`UPDATE`/`DELETE`/`CREATE`/`ALTER`/`DROP`/`TRUNCATE`
- Migrations, seeds, autenticação, endpoints financeiros, ORM definitivo, dashboard, deploy
- Backup/restauração ou alteração de permissões do banco
- Decisão final de ORM/driver — fica como proposta para aprovação em bloco futuro

## 6. Arquivos e Pastas Envolvidos

- `database/inspection/inspect-database.ts` — script de inspeção somente leitura, allowlist de consultas
- `database/inspection/README.md` — atualização se necessário
- `database/current-schema/*.md` — documentos sanitizados do inventário
- `apps/api/.env.local` — credenciais locais, nunca commitado
- `.env.example` — nomes de variáveis (sem valores)
- `apps/api/package.json` — adição de `mysql2` como dependência

## 7. Dependências

- Bloco 01 concluído, commitado e enviado (`7e84e0c`)
- `Docs/03_contracts/contrato_banco_dados.md` — regras do banco existente
- Credenciais reais do MySQL na Clever Cloud, preenchidas manualmente pelo proprietário em `apps/api/.env.local` antes de qualquer conexão

## 8. Plano de Implementação

1. Instalar `mysql2` como dependência de `apps/api` (driver técnico, sem ORM).
2. Atualizar `.env.example` com as variáveis `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_SSL` (opcional: `DATABASE_CONNECT_TIMEOUT`), sem valores reais.
3. Criar `apps/api/.env.local` vazio, confirmar que está no `.gitignore`.
4. Criar `database/inspection/inspect-database.ts` com allowlist fixa de consultas somente leitura (sem aceitar SQL arbitrário de fora).
5. **Parar a execução** e solicitar ao proprietário que preencha manualmente `apps/api/.env.local`. Aguardar confirmação textual ("credenciais preenchidas") antes de prosseguir.
6. Após confirmação: validar apenas presença/formato das variáveis, sem imprimir valores.
7. Testar conectividade com timeout curto; executar apenas as consultas da allowlist.
8. Fechar a conexão/pool corretamente ao final.
9. Documentar o resultado sanitizado em `database/current-schema/` (sem credenciais, sem dados reais).
10. Propor (não decidir) a estratégia de ORM/driver com base no schema encontrado.
11. Gerar e preencher o feedback oficial do bloco.

## 9. Critérios de Aceite

- [ ] `mysql2` instalado em `apps/api` como driver técnico (sem ORM)
- [ ] `apps/api/.env.local` existe, vazio, e está ignorado pelo Git
- [ ] `.env.example` atualizado com nomes de variáveis, sem valores reais
- [ ] Script de inspeção usa allowlist fixa de consultas somente leitura
- [ ] Nenhuma conexão ocorreu antes da confirmação explícita do proprietário
- [ ] Nenhum valor de credencial foi impresso em qualquer saída
- [ ] Inventário documentado em `database/current-schema/` sem dados sensíveis
- [ ] Nenhuma alteração estrutural ou de dados foi feita no banco
- [ ] Proposta de ORM/driver registrada como pendente de aprovação, não como decisão

## 10. Validações Obrigatórias

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`

## 11. Segurança

Este é o bloco de maior risco de segurança da sessão até agora, por lidar com credenciais reais de um banco de produção. Regras: credenciais nunca em código, commit, log ou saída de terminal; conexão só após confirmação explícita do proprietário; allowlist fixa de consultas (sem SQL arbitrário vindo de argumento, endpoint ou entrada externa); nenhuma leitura de conteúdo financeiro ou pessoal das linhas; erros de conexão não podem expor string de conexão, senha ou host completo.

## 12. Performance

Não aplicável além de um timeout de conexão curto e configurável (`DATABASE_CONNECT_TIMEOUT`) para evitar travar a execução caso a Clever Cloud esteja inacessível.

## 13. Design System / UX

Não aplicável — bloco não toca em `apps/web` nem em UI.

## 14. Riscos

- Credenciais vazarem para o Git, logs ou saída de terminal — mitigado por `.gitignore`, allowlist de consultas e regra explícita de nunca imprimir valores.
- Inspeção acidentalmente executar uma consulta fora da allowlist — mitigado por consultas fixas no código, sem interpolação de SQL externo.
- Banco existente ter uma estrutura muito maior/mais complexa do que o esperado, exigindo mais de uma sessão para documentar por completo — se ocorrer, será registrado como pendência, não forçado a caber neste bloco.

## 15. Pendências Esperadas

- P2 — Decisão final de ORM/driver permanece pendente após este bloco; será tratada em bloco futuro, com base no inventário aqui produzido.
- P3 — Caso o schema existente seja extenso, a documentação em `database/current-schema/` pode precisar de refinamento em uma sessão dedicada de arquitetura/contratos.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_02_inventario_seguro_do_banco_existente --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(inventario_seguro_do_banco_existente): _..._
```
