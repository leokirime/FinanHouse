import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = path.resolve(process.cwd(), 'src')
const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json')

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

/** Remove comentários antes de checar os padrões — este próprio arquivo, a documentação e os comentários do código mencionam "react-router-dom" em prosa ao explicar a migração. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('migração de roteamento: react-router-dom@7.18.1 -> react-router@8.3.0 (DT-03)', () => {
  const files = listSourceFiles(SRC_ROOT)
  const contentsByFile = new Map(files.map((file) => [file, stripComments(readFileSync(file, 'utf8'))]))
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as {
    dependencies: Record<string, string>
  }

  it('fixa react-router em 8.3.0 exato (sem ^/~) nas dependências de produção', () => {
    expect(packageJson.dependencies['react-router']).toBe('8.3.0')
  })

  it('não depende de react-router-dom (descontinuado a partir da v8)', () => {
    expect(packageJson.dependencies).not.toHaveProperty('react-router-dom')
  })

  it('não instala pacotes de modo framework/SSR do React Router (@react-router/dev, @react-router/node, create-react-router)', () => {
    const allDeps = { ...packageJson.dependencies }
    expect(Object.keys(allDeps).some((name) => name.startsWith('@react-router/'))).toBe(false)
    expect(allDeps).not.toHaveProperty('create-react-router')
  })

  it('nenhum arquivo de src/ importa de "react-router-dom"', () => {
    const offenders = files.filter((file) => /['"]react-router-dom['"]/.test(contentsByFile.get(file)!))
    expect(offenders).toEqual([])
  })

  it('todo uso de roteamento em src/ importa do pacote único "react-router"', () => {
    const usesRouterApi = /\b(BrowserRouter|MemoryRouter|HashRouter|Routes|Route|Navigate|NavLink|Link|Outlet|useLocation|useNavigate)\b/
    const importsFromReactRouter = /from ['"]react-router['"]/
    const offenders = files.filter((file) => {
      const content = contentsByFile.get(file)!
      return usesRouterApi.test(content) && !importsFromReactRouter.test(content)
    })
    expect(offenders).toEqual([])
  })

  it('nenhum arquivo de src/ usa APIs unstable/RSC do React Router', () => {
    const pattern = /\bunstable_[A-Za-z]+\b|RSCStaticRouter|RSCDefaultRootErrorBoundary|react-router\/rsc/
    const offenders = files.filter((file) => pattern.test(contentsByFile.get(file)!))
    expect(offenders).toEqual([])
  })

  it('nenhum arquivo de src/ usa modo framework/data router (RouterProvider/createBrowserRouter) — projeto continua SPA declarativa', () => {
    const pattern = /\bRouterProvider\b|\bcreateBrowserRouter\b|\bcreateMemoryRouter\b|\bcreateHashRouter\b|\bcreateStaticRouter\b/
    const offenders = files.filter((file) => pattern.test(contentsByFile.get(file)!))
    expect(offenders).toEqual([])
  })

  it('nenhum arquivo de src/ configura SSR (react-dom/server, renderToString/Pipeable, hydrateRoot)', () => {
    const pattern = /react-dom\/server|renderToString|renderToPipeableStream|renderToReadableStream|\bhydrateRoot\b/
    const offenders = files.filter((file) => pattern.test(contentsByFile.get(file)!))
    expect(offenders).toEqual([])
  })
})
