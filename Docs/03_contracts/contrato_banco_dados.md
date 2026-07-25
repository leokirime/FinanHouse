# Contrato de Banco de Dados

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Este contrato define o que o código pode assumir sobre o esquema do banco. Mudança de esquema sem migração registrada aqui é uma quebra de contrato.

> **Estado atual (2026-07-25):** o MySQL do Finanhouse **já existe** na Clever Cloud. Ele é tratado como não descartável e potencialmente contendo estrutura ou dados — ainda não inspecionado. As seções abaixo (modelo de dados, migrações, etc.) permanecem como placeholder até que uma inspeção somente leitura seja realizada (`database/inspection/`) e o estado real seja documentado em `database/current-schema/`. Nenhum schema fictício deve ser escrito aqui antes disso.

## 1. Objetivo

Garantir que toda mudança de esquema seja intencional, registrada e reversível.

## 2. Responsabilidade

O que a camada de acesso a dados garante (integridade referencial, transações, constraints) versus o que a aplicação precisa validar antes de persistir.

_..._

## 3. Modelo de Dados

Entidades principais, campos, tipos, relacionamentos.

| Entidade | Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|---|
| _..._ | _..._ | _..._ | Sim / Não | _..._ |

## 4. Inputs

O que a aplicação envia ao persistir (formato esperado antes da gravação, validações de domínio aplicadas antes do INSERT/UPDATE).

_..._

## 5. Outputs

O que uma consulta retorna, incluindo casos de ausência (registro não encontrado é `null`, lista vazia, ou exceção?).

_..._

## 6. Formatos Esperados

Tipos de data/hora (UTC? timezone local?), encoding de texto, formato de IDs, campos de auditoria (`created_at`, `updated_at`, soft delete).

_..._

## 7. Regras Obrigatórias

- [ ] Toda migração é reversível ou tem plano de rollback documentado.
- [ ] Nenhuma coluna obrigatória é adicionada em tabela com dados existentes sem valor padrão ou backfill.
- [ ] _..._

## 8. Migrações

Ferramenta usada, convenção de nomenclatura, como rodar localmente e em produção.

_A definir após o inventário do banco existente. Nenhuma migration deve ser criada ou aplicada — e nenhum `CREATE TABLE`/`DROP`/`TRUNCATE`/`ALTER`/`DELETE`/`UPDATE`/`INSERT` executado — antes da inspeção somente leitura documentar o que já existe em `database/current-schema/`._

## 9. Erros Esperados

Violação de constraint, deadlock, timeout de conexão — como cada caso deve ser tratado pela aplicação.

_..._

## 10. Validações

O que é validado no banco (constraints, triggers) versus o que é validado só na aplicação.

_..._

## 11. Versionamento do Contrato

Como uma mudança de esquema breaking é comunicada e coordenada com o deploy da aplicação que a usa.

_..._

## 12. Decisões Pendentes

- Realizar inspeção somente leitura do MySQL existente na Clever Cloud (conectividade, versão, schemas/tabelas/colunas, chaves/índices/relacionamentos, presença de registros sem expor conteúdo sensível).
- Definir se o schema existente será reaproveitado integralmente, adaptado por migrations incrementais, ou substituído por migração controlada.
- Biblioteca de acesso ao MySQL e estratégia de migrations (ver `Docs/02_architecture/decisoes_tecnicas.md`, seção 5) — pendente até o inventário acima.
