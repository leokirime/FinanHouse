# ADR-001 — Persistência: Drizzle ORM + mysql2

> Projeto: HouseManager · Data: 2026-07-25 · Status: Aceito

## Contexto

O MySQL do Finanhouse já existe na Clever Cloud. O inventário somente leitura realizado no Bloco 02 (`Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_02_inventario_seguro_do_banco_existente.md`) confirmou conectividade (MySQL 8.4.2-2) e que o banco está **estruturalmente vazio** — 0 tabelas. Não há schema legado a preservar, adaptar ou migrar: o domínio financeiro do Finanhouse será modelado do zero.

Era preciso decidir a camada de acesso a dados antes de modelar o schema: driver puro (`mysql2`) ou um ORM tipado sobre ele.

## Decisão

**Drizzle ORM + mysql2.**

- `mysql2` é o driver real de conexão com o MySQL.
- Drizzle ORM define o schema como código TypeScript e gera as migrations a partir dele.
- `drizzle-kit` é usado apenas para `generate` (gerar SQL a partir do schema) — nunca `push` ou `migrate` sem autorização explícita.

## Alternativas Consideradas

- **`mysql2` puro, sem ORM:** mais simples e com controle total do SQL, adequado para um sistema de apenas 2 usuários. Descartado como escolha principal porque exige tipagem manual e migrations escritas à mão, aumentando o risco de divergência entre código e schema conforme o domínio cresce (recorrências, parcelamentos, planejamento).
- **Prisma, TypeORM, Sequelize, Knex:** descartados por trazerem mais complexidade/runtime do que o projeto precisa (ex.: Prisma exige um engine binário separado, mais pesado para Vercel Functions); não há vantagem clara sobre Drizzle para este escopo.

## Consequências

- Schema TypeScript em `apps/api/src/db/schema/` é a fonte de verdade do modelo de dados desejado.
- Migrations são geradas (`drizzle-kit generate`), revisadas manualmente e só aplicadas ao MySQL mediante autorização explícita do proprietário — nunca `drizzle-kit push` (sincronização automática de schema é proibida, inclusive em desenvolvimento).
- `apps/api` ganha uma dependência de produção (`drizzle-orm`) e uma de desenvolvimento (`drizzle-kit`), além de `mysql2` já presente.
- Torna mais fácil evoluir o schema com segurança de tipos; torna um pouco mais custoso trocar de ORM no futuro (custo aceito, dado o tamanho do domínio).
- `drizzle.config.ts` nunca contém credenciais e não conecta ao banco durante `generate` (comando puramente estático, a partir do TypeScript).

## Restrições Operacionais

- Proibido `drizzle-kit push` em qualquer ambiente.
- Proibido aplicar migration (`drizzle-kit migrate`) sem revisão e autorização explícita do proprietário.
- Nenhuma migration destrutiva (`DROP`, `TRUNCATE`, dados reais) sem aprovação explícita, mesmo depois de revisada.
- Toda migration gerada é revisada manualmente antes de qualquer aplicação futura.

## Pendência Relacionada — TLS/SSL

A conexão do Bloco 02 usou `DATABASE_SSL=false` apenas para o inventário de metadados (sem dados sensíveis). A aplicação em produção (Vercel → MySQL Clever Cloud) precisa de transporte seguro antes de qualquer inserção de dado real. Ver `Docs/03_contracts/contrato_banco_dados.md`, seção de pendências — registrado como **P2**, não resolvido neste ADR. Não presumir que a configuração usada na inspeção do Bloco 02 é a configuração final de produção.

## Status

Vigente.
