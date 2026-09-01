import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { MigrationsJournalError, readExpectedMigrationCount } from './migrations-journal.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Este teste está em `apps/api/src/db/` — `db-bootstrap-household.ts` está
 * em `apps/api/scripts/` e resolve o journal a partir do PRÓPRIO `__dirname`
 * como `path.resolve(__dirname, '../../../database/migrations/meta/_journal.json')`.
 * Para provar a resolução no contexto real do script sem importá-lo (importar
 * o script executaria `main()` — abriria conexão de verdade), calculamos aqui
 * o diretório do script por aritmética de caminho (`../../scripts`, a partir
 * deste arquivo) e aplicamos a MESMA expressão relativa que o script usa.
 */
const SCRIPT_DIRNAME = path.resolve(__dirname, '../../scripts')
const JOURNAL_PATH_AS_RESOLVED_BY_SCRIPT = path.resolve(SCRIPT_DIRNAME, '../../../database/migrations/meta/_journal.json')

/** Segunda rota, independente, até o mesmo arquivo — para provar que as duas contas batem no mesmo arquivo real (não em cópias/coincidências de nome). */
const JOURNAL_PATH_INDEPENDENT = path.resolve(__dirname, '../../../../database/migrations/meta/_journal.json')

function realEntriesLength(): number {
  const raw = readFileSync(JOURNAL_PATH_INDEPENDENT, 'utf-8')
  return (JSON.parse(raw) as { entries: unknown[] }).entries.length
}

describe('readExpectedMigrationCount — resolução real do journal usado por db-bootstrap-household.ts', () => {
  it('a expressão relativa usada pelo script resolve para o mesmo arquivo real que uma segunda rota independente', () => {
    expect(JOURNAL_PATH_AS_RESOLVED_BY_SCRIPT).toBe(JOURNAL_PATH_INDEPENDENT)
  })

  it('lê o journal oficial real e retorna journal.entries.length — não um valor fixo no código', () => {
    const result = readExpectedMigrationCount(JOURNAL_PATH_AS_RESOLVED_BY_SCRIPT)
    expect(result).toBe(realEntriesLength())
    // Hoje isso é 5 como CONSEQUÊNCIA do conteúdo real do arquivo, nunca hardcoded na implementação.
    expect(result).toBe(5)
  })

  describe('fail-closed contra journal ausente/inválido (arquivos temporários locais, nunca o repositório real)', () => {
    let tempDir: string

    afterEach(() => {
      if (tempDir) rmSync(tempDir, { recursive: true, force: true })
    })

    it('recusa quando o arquivo não existe', () => {
      tempDir = mkdtempSync(path.join(tmpdir(), 'migrations-journal-test-'))
      const missingPath = path.join(tempDir, 'nao-existe.json')
      expect(() => readExpectedMigrationCount(missingPath)).toThrow(MigrationsJournalError)
    })

    it('recusa quando o conteúdo não é JSON válido', () => {
      tempDir = mkdtempSync(path.join(tmpdir(), 'migrations-journal-test-'))
      const invalidPath = path.join(tempDir, 'invalido.json')
      writeFileSync(invalidPath, '{ isso não é json', 'utf-8')
      expect(() => readExpectedMigrationCount(invalidPath)).toThrow(MigrationsJournalError)
    })

    it('recusa quando o JSON é válido mas não tem o campo "entries" como array', () => {
      tempDir = mkdtempSync(path.join(tmpdir(), 'migrations-journal-test-'))
      const malformedPath = path.join(tempDir, 'malformado.json')
      writeFileSync(malformedPath, JSON.stringify({ version: '7' }), 'utf-8')
      expect(() => readExpectedMigrationCount(malformedPath)).toThrow(MigrationsJournalError)
    })

    it('nunca expõe o caminho completo do sistema de arquivos na mensagem de erro', () => {
      tempDir = mkdtempSync(path.join(tmpdir(), 'migrations-journal-test-'))
      const missingPath = path.join(tempDir, 'nao-existe.json')
      try {
        readExpectedMigrationCount(missingPath)
        expect.unreachable('deveria ter lançado MigrationsJournalError')
      } catch (error) {
        expect(error).toBeInstanceOf(MigrationsJournalError)
        expect((error as Error).message).not.toContain(tempDir)
      }
    })
  })
})
