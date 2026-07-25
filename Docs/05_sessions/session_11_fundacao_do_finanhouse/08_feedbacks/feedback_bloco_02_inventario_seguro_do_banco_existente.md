# Feedback — Bloco 02: Inventário seguro do banco existente

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Resumo Executivo

O MySQL da Clever Cloud foi inspecionado de forma controlada e somente leitura, após pré-validação de segurança (presença/formato das variáveis sem exibir valores) e revisão do script antes de conectar. A conexão foi bem-sucedida (MySQL 8.4.2-2), e o banco configurado corresponde ao banco ativo. Resultado central: **o banco existe mas está estruturalmente vazio** — 0 tabelas, portanto 0 colunas, índices e relacionamentos. Nenhuma credencial foi exibida em nenhum momento, nenhuma escrita ocorreu no banco, e a documentação sanitizada foi gerada em `database/current-schema/`. Como o banco está vazio, a decisão de ORM/driver não depende de compatibilidade com schema legado — fica registrada como proposta técnica, não aprovada.

## 2. Objetivo do Bloco

Conectar de forma controlada e somente leitura ao MySQL já existente na Clever Cloud, documentar sua estrutura atual e produzir evidências suficientes para decidir a estratégia de acesso, modelagem e migrations, sem alterar o banco.

## 3. Escopo Implementado

- Pré-validação de segurança: diretório, branch, `git status`, confirmação de que `apps/api/.env.local` está ignorado pelo Git e ausente do `git status` — sem usar `cat`/`Get-Content`/`printenv`/`echo` de valores.
- Revisão manual do script (`inspect-database.ts`, `write-inventory-docs.ts`) antes de conectar, conferindo allowlist fixa, ausência de SQL externo, não exposição de credenciais, conexão única fechada em `finally`, timeout configurado.
- Reforço do script: validação de formato (porta 1–65535, SSL exatamente `true`/`false`, timeout numérico positivo), categorização de erros sanitizada (incluindo tratamento especial para SSL/TLS sem "correção" automática), comparação de banco configurado vs. ativo sem expor o nome de nenhum dos dois.
- Instalação de `mysql2` em `apps/api` como driver técnico.
- Execução real da inspeção: teste de conectividade, versão do MySQL, listagem de tabelas/colunas/índices/chaves estrangeiras via `information_schema` — banco confirmado vazio.
- Geração dos documentos sanitizados em `database/current-schema/` (`inspection-summary.md`, `tables.md`, `indexes.md`, `relationships.md`, `inventory.md`), incluindo a nota explícita de banco existente porém sem schema de aplicação.
- Análise do schema encontrado vs. domínio planejado do Finanhouse (seção 10 abaixo) e proposta técnica de acesso a dados (seção 11 abaixo) — ambas não implementadas, apenas documentadas.

## 4. Arquivos Criados

- `database/inspection/inspect-database.ts` — script principal de inspeção (allowlist fixa, validação de formato, categorização de erros)
- `database/inspection/write-inventory-docs.ts` — gera a documentação sanitizada
- `database/inspection/package.json`, `database/inspection/tsconfig.json`
- `apps/api/.env.local` (vazio inicialmente; preenchido manualmente pelo proprietário — nunca commitado)
- `database/current-schema/inspection-summary.md`, `tables.md`, `indexes.md`, `relationships.md`, `inventory.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_02_inventario_seguro_do_banco_existente.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_02_inventario_seguro_do_banco_existente.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_02_inventario_seguro_do_banco_existente.md` (este arquivo)

## 5. Arquivos Alterados

- `.env.example` — variáveis separadas (sem `DATABASE_URL`), adicionada `DATABASE_CONNECT_TIMEOUT`
- `apps/api/package.json` — adicionada dependência `mysql2`
- `package.json` (raiz) — scripts `inspect:db` e `typecheck:inspect-db`
- `database/inspection/README.md` — documentação de uso, allowlist de consultas, regras
- `database/current-schema/inventory.md` — seção "Observações" preenchida com o achado real (banco vazio)

## 6. Arquivos Removidos

_Nenhum arquivo removido neste bloco._

## 7. Comandos Executados

```
npx ddae-engine block create "Inventário seguro do banco existente" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_02_inventario_seguro_do_banco_existente --session session_11_fundacao_do_finanhouse
npm install mysql2   (dentro de apps/api)
git check-ignore -v apps/api/.env.local
git status --short
npx tsc -p database/inspection/tsconfig.json
npx oxlint database/inspection
npm run inspect:db   (executado duas vezes: 1ª interrompida por variáveis ausentes, 2ª bem-sucedida)
npx ddae-engine feedback create --block bloco_02_inventario_seguro_do_banco_existente --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- Manual: 1ª execução de `npm run inspect:db` com `apps/api/.env.local` ainda vazio → script reportou corretamente todas as variáveis como "ausente" (exceto `DATABASE_CONNECT_TIMEOUT`, com padrão aplicado) e interrompeu antes de qualquer tentativa de conexão. Nenhum valor exibido.
- Manual: 2ª execução após o proprietário preencher `apps/api/.env.local` → todas as variáveis reportadas como "configurado" (sem exibir valores); conexão bem-sucedida; `SELECT 1`, `SELECT VERSION()`, `SELECT DATABASE()` executados; comparação "banco configurado corresponde ao banco ativo: sim" (sem expor nenhum dos dois nomes); `information_schema.tables/columns/statistics/key_column_usage/referential_constraints` consultados; 0 tabelas encontradas.
- Typecheck automatizado: `npx tsc -p database/inspection/tsconfig.json` — sem erros.
- Lint automatizado: `npx oxlint database/inspection` — sem erros.
- Verificação manual de que `apps/api/.env.local` nunca apareceu em `git status --short` em nenhuma das execuções.

## 9. Validações Executadas

- `npx tsc -p database/inspection/tsconfig.json` — OK
- `npx oxlint database/inspection` — OK
- `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` (workspaces) — resultados na seção 10 do relatório final apresentado ao usuário
- `ddae-engine validate` / `ddae-engine audit` — idem

## 10. Decisões Técnicas

- **Formato de conexão:** variáveis separadas (`DATABASE_HOST`, `DATABASE_PORT`, etc.), sem `DATABASE_URL`, conforme já decidido no Bloco 02 original.
- **Análise do schema encontrado vs. domínio planejado do Finanhouse:** como o banco está vazio, cada estrutura do domínio planejado é classificada como **ausente**:

  | Estrutura planejada | Classificação |
  |---|---|
  | Usuários | Ausente |
  | Residência/núcleo doméstico | Ausente |
  | Membros | Ausente |
  | Categorias | Ausente |
  | Movimentações | Ausente |
  | Competência mensal | Ausente |
  | Receitas | Ausente |
  | Despesas | Ausente |
  | Recorrências | Ausente |
  | Parcelamentos | Ausente |
  | Planejamento | Ausente |
  | Fechamento mensal | Ausente |
  | Histórico | Ausente |

  Não há nenhuma estrutura reaproveitável, adaptável ou obsoleta — o domínio inteiro precisa ser modelado do zero, sem risco de colisão com dados existentes.

- **Proposta técnica de acesso a dados (não aprovada, dependente de autorização do proprietário):**

  | Critério | `mysql2` direto | Drizzle + `mysql2` |
  |---|---|---|
  | Compatibilidade com schema existente | N/A (schema vazio) | N/A (schema vazio) |
  | Tipagem TypeScript | Manual (tipos escritos à mão) | Inferida a partir do schema declarado |
  | Consultas financeiras | SQL cru, mais controle fino | Query builder tipado, menos boilerplate |
  | Manutenção | Mais verboso conforme o domínio cresce | Schema como código, mudanças centralizadas |
  | Migrations incrementais | Manuais (SQL escrito à mão) | `drizzle-kit` gera migrations a partir do schema |
  | Risco de alteração involuntária | Baixo (SQL explícito, sem "magia") | Baixo-médio (gerador de migration precisa ser revisado antes de aplicar) |
  | Integração com Node.js/TS | Nativa, simples | Nativa, boa integração com TS |
  | Execução futura na Vercel (Functions) | Leve, sem overhead de ORM | Leve, Drizzle é serverless-friendly |
  | Simplicidade para 2 usuários | Alta — sistema pequeno não precisa de abstração pesada | Média — ainda é simples, mas adiciona uma camada |
  | Custo de complexidade | Menor | Ligeiramente maior, compensado por segurança de tipos |

  **Recomendação preliminar (proposta técnica, não aprovada):** como o banco está vazio e o domínio será modelado do zero, **Drizzle + mysql2** tende a reduzir risco de erro humano em migrations futuras e dá tipagem de ponta a ponta — mas para um sistema de 2 usuários, `mysql2` puro também é uma escolha legítima e mais simples. Esta é uma proposta a ser decidida pelo proprietário, não uma decisão tomada neste bloco. Registrada como decisão pendente em `Docs/02_architecture/decisoes_tecnicas.md`.

## 11. Problemas Encontrados

- Na primeira tentativa de execução, `apps/api/.env.local` ainda continha apenas valores vazios (preenchimento não havia sido salvo) — o script corretamente detectou e interrompeu antes de conectar, sem expor nada. Resolvido após o proprietário preencher e salvar o arquivo.

## 12. Correções Aplicadas Durante o Bloco

- Reforço da validação de variáveis de ambiente (de checagem simples de presença para checagem de presença + formato: porta numérica 1–65535, SSL exatamente `true`/`false`, timeout numérico positivo).
- Remoção do nome real do banco de todas as saídas de terminal e de todos os documentos gerados (`database/current-schema/*.md`) — a comparação "banco configurado corresponde ao banco ativo" agora retorna apenas sim/não.
- Ampliação da consulta de colunas para incluir tamanho/precisão e indicador de auto-incremento (`EXTRA`), atendendo ao detalhamento pedido no inventário.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Resolvida em 2026-07-25 pelo Bloco 03 (`bloco_03_modelagem_inicial_do_dominio_financeiro`)._ As duas pendências originalmente registradas aqui — decisão entre `mysql2` direto e Drizzle+mysql2, e modelagem do schema do zero — foram encerradas: o proprietário aprovou Drizzle ORM + mysql2 (ADR-001, `Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`; DT-01 em `Docs/02_architecture/decisoes_tecnicas.md`; RD-01 em `Docs/04_governance/registro_decisoes.md`), e as 6 tabelas da fundação do domínio financeiro foram modeladas em `apps/api/src/db/schema/`, com migration gerada e revisada (ainda não aplicada). Pendências novas e ainda ativas (verificação de TLS, autorização para aplicar a migration) estão registradas no feedback do Bloco 03, não aqui.

### P3 — Melhoria Recomendada

- Considerar documentar em `Docs/01_product/requisitos_funcionais.md` o desenho conceitual do domínio antes de gerar a primeira migration, para que o schema nasça alinhado ao produto, não improvisado.

### P4 — Opcional

_Nenhuma pendência opcional identificada._

## 14. Riscos Restantes

- Nenhum risco de colisão com dados existentes (banco vazio), mas a ausência total de schema significa que a primeira migration real definirá a base de todo o domínio financeiro — vale revisão cuidadosa antes de aplicar.
- Decisão de ORM/driver ainda pendente; adiar demais pode acumular código de acesso a dados ad-hoc que precisaria ser refeito depois.

## 15. Evidências

```
$ npm run inspect:db   (1ª execução, .env.local vazio)
Status das variáveis de ambiente (valores nunca são exibidos):
  DATABASE_HOST: ausente
  DATABASE_NAME: ausente
  DATABASE_USER: ausente
  DATABASE_PASSWORD: ausente
  DATABASE_PORT: ausente
  DATABASE_SSL: ausente
  DATABASE_CONNECT_TIMEOUT: configurado
Inspeção interrompida. Variáveis pendentes: ausente: DATABASE_HOST, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_SSL

$ npm run inspect:db   (2ª execução, .env.local preenchido)
Status das variáveis de ambiente (valores nunca são exibidos):
  DATABASE_HOST: configurado
  DATABASE_NAME: configurado
  DATABASE_USER: configurado
  DATABASE_PASSWORD: configurado
  DATABASE_PORT: configurado
  DATABASE_SSL: configurado
  DATABASE_CONNECT_TIMEOUT: configurado

Conectividade: OK
Versão do MySQL: 8.4.2-2
Banco configurado corresponde ao banco ativo: sim
Tabelas encontradas: 0

Inventário sanitizado escrito em: database/current-schema
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Modelagem inicial do schema do Finanhouse (usuários, residência/núcleo doméstico, categorias, movimentações, competência mensal, recorrências, planejamento, histórico) e decisão formal de ORM/driver (`mysql2` vs. Drizzle) com base na proposta técnica registrada neste feedback — antes da primeira migration real.

## 18. Commit Semântico Sugerido

```
feat(inventario_seguro_do_banco_existente): inventariar somente leitura o MySQL existente na Clever Cloud (banco vazio)
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
