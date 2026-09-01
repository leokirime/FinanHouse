/**
 * Bootstrap estrutural PERMANENTE do household inicial do FinanHouse — Bloco
 * 17, estendido na Sessão 14/Bloco 03 (FASE D.1) para reconhecer
 * `finanhouse_prod` como alvo oficial além de `finanhouse_dev`. Diferente do
 * smoke-test transacional (Blocos 13/14/16), este script **não faz
 * rollback**: cria, em uma única transação com `COMMIT`, o usuário
 * proprietário, o household, os dois membros e as sete categorias
 * estruturais que o frontend real precisa para funcionar contra a API HTTP
 * (Bloco 16) — sem esses dados, não há `householdId` válido para configurar
 * `apps/web/.env.local`/`VITE_FINANHOUSE_HOUSEHOLD_ID`.
 *
 * NÃO é executado automaticamente. Exige simultaneamente:
 *   1. `apps/api/.env.local` preenchido com credenciais reais do Aiven;
 *   2. DATABASE_PROVIDER=aiven, e (DATABASE_ENV=development + DATABASE_NAME=finanhouse_dev) OU (DATABASE_ENV=production + DATABASE_NAME=finanhouse_prod);
 *   3. o banco alvo com exatamente as migrations do journal oficial (`database/migrations/meta/_journal.json`) já aplicadas — nem menos (desatualizado), nem mais (inconsistente);
 *   4. nenhum household já existente no banco alvo;
 *   5. `FINANHOUSE_BOOTSTRAP_OWNER_NAME`/`_OWNER_EMAIL`/`_PARTNER_NAME`/`_PARTNER_EMAIL`/`_HOUSEHOLD_NAME` preenchidos;
 *   6. `CONFIRM_HOUSEHOLD_BOOTSTRAP=true` definido explicitamente no ambiente;
 *   7. autorização explícita do proprietário do projeto para esta execução.
 *
 * Uso: CONFIRM_HOUSEHOLD_BOOTSTRAP=true npm run db:bootstrap:household
 * Contra produção: DATABASE_ENV=production DATABASE_NAME=finanhouse_prod CONFIRM_HOUSEHOLD_BOOTSTRAP=true npm run db:bootstrap:household
 *
 * Não cria movimentações, competências, orçamentos nem dados aleatórios.
 * Não existe porta/repositório para `users`/`households` (DT-10) — assim
 * como no smoke-test dos repositórios, este utilitário usa Drizzle direto,
 * apenas para essas duas entidades estruturais.
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import type { ResultSetHeader } from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import { categorizeConnectionError } from '../src/db/sanitize-error.js'
import { MIGRATIONS_TABLE_NAME } from '../src/db/schema-audit.js'
import { categories, households, householdMembers, users } from '../src/db/schema/index.js'
import {
  assertBootstrapEnvironmentAllowed,
  assertBootstrapMigrationsMatchJournal,
  assertNoExistingHousehold,
  BootstrapGuardError,
} from '../src/db/household-bootstrap-guard.js'
import { BootstrapInputError, resolveBootstrapInput } from '../src/db/household-bootstrap-input.js'
import { MigrationsJournalError, readExpectedMigrationCount } from '../src/db/migrations-journal.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')
const MIGRATIONS_JOURNAL_PATH = path.resolve(__dirname, '../../../database/migrations/meta/_journal.json')

/** Mesmas sete categorias estruturais que alimentavam o modo demonstrativo (Bloco 07) — agora criadas como dados reais, nunca fictícios em runtime. */
const STRUCTURAL_CATEGORIES: Array<{ name: string; entryType: 'income' | 'expense' }> = [
  { name: 'Salário', entryType: 'income' },
  { name: 'Freelance', entryType: 'income' },
  { name: 'Moradia', entryType: 'expense' },
  { name: 'Alimentação', entryType: 'expense' },
  { name: 'Transporte', entryType: 'expense' },
  { name: 'Lazer', entryType: 'expense' },
  { name: 'Saúde', entryType: 'expense' },
]

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
}

async function main(): Promise<void> {
  if (process.env.CONFIRM_HOUSEHOLD_BOOTSTRAP !== 'true') {
    console.error(
      '\nCONFIRM_HOUSEHOLD_BOOTSTRAP=true é obrigatório para executar o bootstrap estrutural.\n' +
        'Sem essa confirmação explícita, nenhuma conexão é aberta e nenhuma escrita é realizada.',
    )
    process.exit(1)
  }

  loadLocalEnv()

  let bootstrapInput
  try {
    bootstrapInput = resolveBootstrapInput(process.env)
  } catch (error) {
    const message = error instanceof BootstrapInputError ? error.message : 'Variáveis do bootstrap inválidas.'
    console.error(`\n${message}`)
    process.exit(1)
  }

  let config
  try {
    config = resolveDatabaseConfig(process.env)
  } catch (error) {
    const message = error instanceof DatabaseConfigError ? error.message : 'Configuração de banco inválida.'
    console.error(`\nConfiguração inválida: ${message}`)
    process.exit(1)
  }

  try {
    assertBootstrapEnvironmentAllowed({
      provider: config.provider,
      environment: config.environment,
      database: config.database,
      confirmFlag: process.env.CONFIRM_HOUSEHOLD_BOOTSTRAP,
    })
  } catch (error) {
    const message = error instanceof BootstrapGuardError ? error.message : 'Ambiente não permitido para o bootstrap.'
    console.error(`\n${message}`)
    process.exit(1)
  }

  let expectedMigrationCount: number
  try {
    expectedMigrationCount = readExpectedMigrationCount(MIGRATIONS_JOURNAL_PATH)
  } catch (error) {
    const message = error instanceof MigrationsJournalError ? error.message : 'Journal de migrations inválido.'
    console.error(`\n${message}`)
    process.exit(1)
  }

  console.log(`Provider: ${config.provider}`)
  console.log(`Ambiente: ${config.environment}`)
  console.log(`Banco: ${config.database}`)

  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
    })

    const [cipherRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [Array<{ Value: string }>, unknown]
    const tlsActive = (cipherRows[0]?.Value ?? '').length > 0
    console.log(`TLS ativo: ${tlsActive ? 'sim' : 'não'}`)
    if (!tlsActive) {
      throw new BootstrapGuardError('TLS não está ativo na conexão — bootstrap abortado antes de qualquer escrita.')
    }

    const [migrationsRows] = (await connection.query(`SELECT \`hash\` FROM \`${MIGRATIONS_TABLE_NAME}\``)) as [Array<{ hash: string }>, unknown]
    assertBootstrapMigrationsMatchJournal({ appliedCount: migrationsRows.length, expectedCount: expectedMigrationCount })
    console.log(`Migrations aplicadas: ${migrationsRows.length} (journal oficial espera: ${expectedMigrationCount})`)

    const [householdCountRows] = (await connection.query('SELECT COUNT(*) AS total FROM `households`')) as [Array<{ total: number }>, unknown]
    const householdCountBefore = Number(householdCountRows[0]?.total ?? 0)
    assertNoExistingHousehold({ householdCount: householdCountBefore })
    console.log('Nenhum household existente (confirmado) — seguro para criar a estrutura inicial.')

    const db = drizzle(connection)

    console.log('\nCriando estrutura inicial (transação permanente — sem rollback ao final)...')

    let householdId = 0
    let ownerUserId = 0
    let partnerUserId = 0
    let ownerMemberId = 0
    let partnerMemberId = 0
    let categoryIds: number[] = []

    await db.transaction(async (tx) => {
      const [ownerUser] = (await tx
        .insert(users)
        .values({ displayName: bootstrapInput.ownerName, email: bootstrapInput.ownerEmail, status: 'active' })) as unknown as [
        ResultSetHeader,
        unknown,
      ]
      ownerUserId = ownerUser.insertId

      const [partnerUser] = (await tx
        .insert(users)
        .values({ displayName: bootstrapInput.partnerName, email: bootstrapInput.partnerEmail, status: 'active' })) as unknown as [
        ResultSetHeader,
        unknown,
      ]
      partnerUserId = partnerUser.insertId

      const [household] = (await tx
        .insert(households)
        .values({ name: bootstrapInput.householdName, createdByUserId: ownerUserId })) as unknown as [ResultSetHeader, unknown]
      householdId = household.insertId

      const [ownerMember] = (await tx
        .insert(householdMembers)
        .values({ householdId, userId: ownerUserId, role: 'owner', status: 'active' })) as unknown as [ResultSetHeader, unknown]
      ownerMemberId = ownerMember.insertId

      const [partnerMember] = (await tx
        .insert(householdMembers)
        .values({ householdId, userId: partnerUserId, role: 'member', status: 'active' })) as unknown as [ResultSetHeader, unknown]
      partnerMemberId = partnerMember.insertId

      for (const category of STRUCTURAL_CATEGORIES) {
        const [inserted] = (await tx
          .insert(categories)
          .values({ householdId, name: category.name, entryType: category.entryType, status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        categoryIds.push(inserted.insertId)
      }
    })

    console.log('\nBootstrap estrutural aprovado — dados permanentes criados (nenhum rollback):')
    console.log(`  householdId: ${householdId}`)
    console.log(`  ownerMemberId: ${ownerMemberId} / partnerMemberId: ${partnerMemberId}`)
    console.log(`  categorias criadas: ${categoryIds.length} (${STRUCTURAL_CATEGORIES.map((category) => category.name).join(', ')})`)
    console.log('\nConfigure apps/web/.env.local com VITE_FINANHOUSE_HOUSEHOLD_ID igual ao householdId acima.')

    const [auditRows] = (await connection.query(
      'SELECT (SELECT COUNT(*) FROM households) AS households, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM household_members) AS members, (SELECT COUNT(*) FROM categories) AS categories, (SELECT COUNT(*) FROM monthly_periods) AS periods, (SELECT COUNT(*) FROM financial_entries) AS entries',
    )) as [Array<{ households: number; users: number; members: number; categories: number; periods: number; entries: number }>, unknown]
    const audit = auditRows[0]!
    console.log('\nAuditoria pós-bootstrap (somente contagens, nenhum dado pessoal):')
    console.log(`  households: ${audit.households} · users: ${audit.users} · household_members: ${audit.members}`)
    console.log(`  categories: ${audit.categories} · monthly_periods: ${audit.periods} (esperado 0) · financial_entries: ${audit.entries} (esperado 0)`)
    if (audit.periods !== 0 || audit.entries !== 0) {
      throw new Error('Auditoria pós-bootstrap reprovada: monthly_periods/financial_entries deveriam continuar vazias.')
    }
  } catch (error) {
    if (error instanceof BootstrapGuardError) {
      console.error(`\nBootstrap reprovado: ${error.message}`)
      process.exitCode = 1
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFalha no bootstrap. Categoria: ${categorizeConnectionError(message)}`)
    process.exitCode = 1
  } finally {
    await connection?.end()
  }
}

main()
