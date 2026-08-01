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

/** Identificadores do antigo modo demonstrativo (Bloco 07–16) — nunca devem voltar ao código de produção (DT-12, corte direto do Bloco 17). */
const FORBIDDEN_DEMO_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'FinanceDemoProvider', pattern: /FinanceDemoProvider/ },
  { name: 'useFinanceDemo', pattern: /useFinanceDemo\b/ },
  { name: 'financeDemoReducer', pattern: /financeDemoReducer/ },
  { name: 'dashboard-fixtures', pattern: /dashboard-fixtures/ },
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

/** Remove comentários antes de checar os padrões — vários arquivos documentam, em prosa, o que NÃO é usado, o que faria a busca ingênua acusar um falso positivo no próprio comentário. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

/** `import.meta.env`/`ImportMetaEnv` são a API real e correta do Vite para ler `VITE_*` em build-time — não uma leitura de arquivo `.env`, então não devem disparar o padrão "'.env'" abaixo. */
function stripViteEnvApi(source: string): string {
  return source.replace(/import\.meta\.env/g, 'import.meta.ENV_API').replace(/ImportMetaEnv/g, 'ImportMetaENV_API')
}

describe('ausência de persistência local e de fallback demonstrativo em runtime', () => {
  const files = listSourceFiles(SRC_ROOT)

  it('encontra arquivos-fonte para verificar (garante que a checagem não está vazia)', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  for (const { name, pattern } of FORBIDDEN_PATTERNS) {
    it(`nenhum arquivo de src/ referencia "${name}" fora de comentários`, () => {
      const offenders = files.filter((file) => pattern.test(stripViteEnvApi(stripComments(readFileSync(file, 'utf8')))))
      expect(offenders).toEqual([])
    })
  }

  const runtimeFiles = files.filter((file) => !file.split(path.sep).includes('test-support'))

  for (const { name, pattern } of FORBIDDEN_DEMO_PATTERNS) {
    it(`nenhum arquivo de runtime (fora de test-support/) referencia "${name}"`, () => {
      const offenders = runtimeFiles.filter((file) => pattern.test(stripComments(readFileSync(file, 'utf8'))))
      expect(offenders).toEqual([])
    })
  }
})
