import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SCRIPTS = [
  'db-check.ts',
  'db-migrate.ts',
  'db-seed-dev.ts',
  'db-audit-schema.ts',
  'db-audit-responsible-member-integrity.ts',
  'db-bootstrap-household.ts',
  'db-audit-category-budgets.ts',
  'db-configure-initial-passwords.ts',
  'db-audit-auth-sessions.ts',
  'db-smoke-auth-sessions.ts',
]

/**
 * Regressão para um incidente real: `mysql.createConnection(...)` chamado
 * fora do `try/catch` faz uma falha de conexão (ex.: ENOTFOUND) escapar sem
 * sanitização — o Node imprime o objeto de erro bruto no terminal,
 * incluindo o host real. Todo script de banco deve estabelecer a conexão
 * dentro do `try`, e fechar com `connection?.end()` (a variável pode nunca
 * ter sido atribuída se a própria conexão falhar).
 */
describe.each(SCRIPTS)('%s — falha de conexão nunca escapa sem sanitização', (fileName) => {
  const source = readFileSync(path.resolve(__dirname, fileName), 'utf-8')

  it('chama mysql.createConnection depois de "try {", nunca antes', () => {
    const tryIndex = source.indexOf('try {')
    const createConnectionIndex = source.indexOf('mysql.createConnection(')
    expect(tryIndex).toBeGreaterThan(-1)
    expect(createConnectionIndex).toBeGreaterThan(tryIndex)
  })

  it('fecha a conexão com connection?.end() (nunca connection.end() sem guarda)', () => {
    expect(source).toMatch(/await connection\?\.end\(\)/)
    expect(source).not.toMatch(/await connection\.end\(\)/)
  })
})
