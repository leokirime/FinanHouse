# Contrato de Variáveis de Ambiente

> Projeto: FinanHouse · Atualizado em: 2026-07-31

> Nenhum valor real de segredo (chave de API, senha, connection string) deve aparecer neste arquivo — apenas nome, propósito e formato esperado.

## 1. Objetivo

Garantir que qualquer pessoa ou agente consiga configurar o ambiente corretamente sem precisar adivinhar variáveis.

## 2. Responsabilidade

Em desenvolvimento local, cada variável é definida em `apps/api/.env.local` (nunca versionado, sempre ignorado pelo Git). Em produção futura, o mesmo conjunto de variáveis é definido no secret manager da infraestrutura de deploy (ainda não escolhida) — nunca em arquivo versionado. `.env.example` (raiz) documenta a estrutura esperada, sem nenhum valor real. O certificado CA do Aiven referenciado por `DATABASE_CA_PATH`/`DATABASE_CA_CERT_BASE64` é mantido **fora do repositório** em todos os ambientes.

## 3. Variáveis Obrigatórias

Infraestrutura de dados: Aiven for MySQL (ver `Docs/02_architecture/decisoes_tecnicas.md`, DT-07). Resolvidas e validadas de forma centralizada por `apps/api/src/config/database-config.ts` (`resolveDatabaseConfig`) — nenhum outro ponto do código deve validar estas variáveis de forma duplicada.

| Nome | Propósito | Formato esperado | Exemplo (sem valor real) |
|---|---|---|---|
| `DATABASE_PROVIDER` | Identifica o provedor de infraestrutura ativo | Deve ser exatamente `aiven` | `aiven` |
| `DATABASE_ENV` | Identifica o ambiente de banco (não o ambiente de deploy) | `development`, `test` ou `production` | `development` |
| `DATABASE_HOST` | Host do serviço Aiven | String não vazia | _(preencher apenas em `.env.local`)_ |
| `DATABASE_PORT` | Porta do serviço Aiven | Inteiro entre 1 e 65535 | _(preencher apenas em `.env.local`)_ |
| `DATABASE_USER` | Usuário de aplicação (nunca `avnadmin`) | String não vazia | `finanhouse_dev_app` |
| `DATABASE_PASSWORD` | Senha do usuário de aplicação | String não vazia | _(preencher apenas em `.env.local`)_ |
| `DATABASE_NAME` | Banco de dados de destino | `finanhouse_dev` em `development`; `finanhouse_prod` em `production`; nunca `defaultdb` | `finanhouse_dev` |
| `DATABASE_SSL_MODE` | Modo de verificação TLS | Deve ser exatamente `verify_identity` | `verify_identity` |
| `DATABASE_CA_PATH` **ou** `DATABASE_CA_CERT_BASE64` | Origem do certificado CA do Aiven — exatamente uma das duas, nunca as duas | Caminho de arquivo `.pem` existente **ou** conteúdo PEM em Base64 | `C:/Users/<usuario>/.finanhouse/aiven-ca.pem` |

## 4. Variáveis Opcionais

| Nome | Propósito | Valor padrão se omitida |
|---|---|---|
| `CONFIRM_DATABASE_MIGRATION` | Confirmação explícita exigida por `apps/api/scripts/db-migrate.ts` antes de aplicar qualquer migration | `false` (o script para antes de conectar) |

## 5. Inputs

Todas as variáveis acima são lidas exclusivamente através de `resolveDatabaseConfig(env)` (`apps/api/src/config/database-config.ts`), uma função pura que recebe um objeto de ambiente por argumento — nunca lê `process.env` nem `.env.local` diretamente, e nunca é chamada durante a importação de um módulo. É reaproveitada, sem duplicação de regras, pela aplicação, pela factory de pool (`apps/api/src/db/pool.ts`) e pelos três scripts de banco (`db:check`, `db:migrate`, `db:seed:dev`). Cada script carrega `apps/api/.env.local` explicitamente (via `process.loadEnvFile`) apenas no próprio processo do script, nunca como efeito colateral de outro comando (build, lint, typecheck, testes).

## 6. Regras Obrigatórias

- [ ] Nenhum segredo real é commitado no repositório, em nenhum arquivo (incluindo exemplos).
- [ ] Toda variável obrigatória ausente falha a inicialização da aplicação de forma explícita, não silenciosa.
- [ ] `.env.example` (ou equivalente) é mantido atualizado sempre que uma variável é adicionada ou removida.

## 7. Erros Esperados

Qualquer variável obrigatória ausente, vazia ou em formato inválido faz `resolveDatabaseConfig` lançar `DatabaseConfigError` (ou `DatabaseCaResolutionError` para problemas específicos do certificado CA) **antes de qualquer tentativa de conexão** — nenhum fallback silencioso. As mensagens de erro identificam a variável ou regra violada, mas nunca incluem o valor de `DATABASE_HOST`, `DATABASE_PASSWORD`, o caminho de `DATABASE_CA_PATH` ou o conteúdo do certificado.

## 8. Validações

`npm run db:check` (workspace `api`) é a validação de referência: carrega `apps/api/.env.local`, resolve e valida a configuração, abre uma única conexão de teste (`SELECT 1`/`SELECT VERSION()`/`SELECT DATABASE()`, verificação de TLS ativo) e reporta apenas dados não sensíveis (provider, ambiente, banco, versão do MySQL, status de TLS, sucesso/falha) — sem nunca exibir host, porta, usuário, senha ou certificado. Localmente, `npm run test` (workspace `api`) cobre as regras de validação sem exigir nenhuma credencial real nem conexão de rede.

## 9. Versionamento do Contrato

Uma nova variável obrigatória é adicionada primeiro em `resolveDatabaseConfig` (com teste cobrindo o novo caso), depois em `.env.example` (raiz) e nesta tabela, antes de ser exigida em qualquer ambiente real.

## 10. Decisões Pendentes

- ~~A validação real de TLS contra o Aiven (execução real de `db:check`) ainda não ocorreu~~ — **executada em 2026-07-30** pelo proprietário, com sucesso (TLS ativo, MySQL `8.4.8`, banco `finanhouse_dev`, usuário `finanhouse_dev_app`) — ver P2 em `Docs/03_contracts/contrato_banco_dados.md` e DT-07 em `Docs/02_architecture/decisoes_tecnicas.md`.
- ~~A aplicação real da migration inicial (`db:migrate`) continua pendente~~ — **executada em 2026-07-31** (Bloco 12, DT-08): aplicada uma única vez a `finanhouse_dev`, com autorização explícita do proprietário. Os valores reais de `DATABASE_HOST`/`DATABASE_PORT`/`DATABASE_USER`/`DATABASE_PASSWORD`/`DATABASE_CA_PATH` (ou `DATABASE_CA_CERT_BASE64`) permanecem apenas em `apps/api/.env.local`, fora deste contrato e fora do repositório — nunca lidos por este processo de documentação.
