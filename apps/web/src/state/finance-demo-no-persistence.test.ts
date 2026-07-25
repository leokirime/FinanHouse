import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = path.resolve(process.cwd(), 'src')
const FORBIDDEN_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'localStorage', pattern: /\blocalStorage\b/ },
  { name: 'IndexedDB', pattern: /\bindexedDB\b/i },
  { name: 'mysql2', pattern: /['"]mysql2['"]/ },
  { name: 'drizzle-orm', pattern: /['"]drizzle-orm/ },
  { name: '.env', pattern: /\.env(?!\.example)/ },
]

function listSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      files.push(...listSourceFiles(fullPath))
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      files.push(fullPath)
    }
  }
  return files
}

/** Remove comentários antes de checar os padrões — vários arquivos deste bloco documentam, em prosa, que NÃO usam localStorage/IndexedDB, o que faria a busca ingênua acusar um falso positivo no próprio comentário. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('modo demonstrativo — ausência de persistência real', () => {
  const files = listSourceFiles(SRC_ROOT)

  it('encontra arquivos-fonte para verificar (garante que a checagem não está vazia)', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  for (const { name, pattern } of FORBIDDEN_PATTERNS) {
    it(`nenhum arquivo de src/ referencia "${name}" fora de comentários`, () => {
      const offenders = files.filter((file) => pattern.test(stripComments(readFileSync(file, 'utf8'))))
      expect(offenders).toEqual([])
    })
  }
})
