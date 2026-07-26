import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT_PACKAGE_JSON_PATH = path.resolve(process.cwd(), '..', '..', 'package.json')

describe('script local `npm run dev:web` (Bloco 09)', () => {
  const packageJson = JSON.parse(readFileSync(ROOT_PACKAGE_JSON_PATH, 'utf8')) as { scripts: Record<string, string> }

  it('"dev:web" inicia apenas o Vite do workspace web, sem clean nem API', () => {
    expect(packageJson.scripts['dev:web']).toBe('npm run dev --workspace=web')
  })

  it('"predev:web" prepara o pacote domain antes do Vite (sem exigir compilação manual)', () => {
    expect(packageJson.scripts['predev:web']).toBe('npm run build:domain')
  })

  it('"predev:web" não executa `clean` (não apaga packages/domain/dist antes de reconstruí-lo)', () => {
    expect(packageJson.scripts['predev:web']).not.toContain('clean')
  })

  it('"dev:web" não inicia a API nem acessa o banco', () => {
    expect(packageJson.scripts['dev:web']).not.toContain('workspace=api')
    expect(packageJson.scripts['dev:web']).not.toMatch(/mysql|drizzle|db/i)
  })
})
