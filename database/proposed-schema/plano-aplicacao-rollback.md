# Plano de Aplicação e Rollback — Migration Inicial

> Gerado no Bloco 04 (`bloco_04_validacao_tls_e_revisao_pre_migration`) · 2026-07-25.
>
> **Este documento é um plano, não uma execução.** Nenhum comando abaixo foi rodado contra o banco real. A aplicação da migration exige autorização explícita e separada do proprietário, feita depois da leitura deste plano — e **obrigatoriamente** depois de resolver a pendência de TLS com validação estrita de certificado (`database/current-schema/tls-inspection.md`).

## 1. Pré-condições antes de autorizar a aplicação

- [ ] Conexão TLS com validação estrita de certificado (`rejectUnauthorized: true`) funcionando — não apenas TLS com `rejectUnauthorized: false`. Ver decisão de segurança em `tls-inspection.md`, seção 4: essa configuração **não é aceita como risco residual**, é bloqueadora.
- [ ] `database/current-schema/` reconfirmado como vazio (rodar `npm run inspect:db` novamente se muito tempo tiver passado desde o Bloco 02).
- [ ] Migration revisada uma última vez por humano, não só por agente.
- [ ] `apps/api/.env.local` com as credenciais corretas e `DATABASE_SSL=true` com validação de certificado ativa (não `rejectUnauthorized: false`).

## 2. Comando que seria utilizado

```bash
cd apps/api
npx drizzle-kit migrate
```

`drizzle-kit migrate` lê `apps/api/drizzle.config.ts` e `database/migrations/`, aplica as migrations pendentes (neste caso, apenas `0000_initial_financial_domain.sql`) e registra o estado na tabela interna `__drizzle_migrations` do próprio banco. Ele **conecta ao banco real** — por isso não foi executado neste bloco.

`drizzle-kit push` **não deve ser usado em nenhuma circunstância** (sincronização automática sem migration versionada — proibido pelo ADR-001).

## 3. Arquivo de ambiente utilizado

`apps/api/.env.local` (nunca commitado). O comando de aplicação usaria as mesmas variáveis já validadas nos Blocos 02–04 (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_SSL`).

## 4. Validações que precisam ter passado antes

- `npx drizzle-kit check` — OK (confirmado nos Blocos 03 e 04).
- `npm run build` / `lint` / `typecheck` / `test` — OK (confirmado nos Blocos 03 e 04).
- Este plano revisado e aprovado pelo proprietário.

## 5. Confirmação de banco vazio (substitui backup, já que não há dados a perder)

Como `database/current-schema/` confirma 0 tabelas, não há necessidade de backup de dados — não existem dados. A "confirmação de banco vazio" (via `npm run inspect:db` reexecutado imediatamente antes da aplicação) cumpre o papel que um backup cumpriria em um banco com dados reais.

## 6. Verificação posterior esperada (depois de uma aplicação real, quando autorizada)

Após uma futura aplicação (não realizada neste bloco), o passo seguinte seria rodar `npm run inspect:db` novamente e confirmar em `database/current-schema/`:
- 6 tabelas: `users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`.
- Todas as constraints (PK, FKs simples e compostas, UNIQUE, CHECK) presentes exatamente como em `database/proposed-schema/relacionamentos.md`.
- 0 registros em todas as tabelas (schema aplicado, nenhum dado inserido).

## 7. Interrupção imediata em caso de erro

Se `drizzle-kit migrate` retornar erro, a diretriz é: **parar imediatamente, não tentar "corrigir" a migration em produção, não rodar novamente sem entender a causa.** Reportar o erro sanitizado (sem credenciais) e aguardar decisão humana.

## 8. Plano de rollback

Como o banco está confirmado vazio (sem dados reais a perder) e esta é a migration inicial (não há migration anterior para reverter), o rollback é simples em teoria, mas **nenhum comando abaixo é executado automaticamente** — qualquer rollback destrutivo exige autorização explícita separada, assim como a aplicação:

```sql
-- Ordem inversa de dependência (FKs antes das tabelas que as recebem):
DROP TABLE IF EXISTS financial_entries;
DROP TABLE IF EXISTS monthly_periods;
DROP TABLE IF EXISTS household_members;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS households;
DROP TABLE IF EXISTS users;
```

Este bloco de SQL é apresentado como **referência documental**, não como script pronto para execução automática — nenhum agente deve rodá-lo sem uma nova autorização explícita e específica para rollback, exatamente como para a aplicação original.

## 9. Status

Plano documentado. **Nenhum comando de aplicação ou rollback foi executado.** Banco real permanece vazio.
