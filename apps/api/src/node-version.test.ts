import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Sessão 14, Bloco 02 — achado real durante a validação de compatibilidade
 * com Render: a versão do Node nunca foi declarada em nenhum lugar do
 * repositório (nem `.node-version`, nem `engines.node`). Plataformas de
 * deploy (Render incluído) usam essa declaração para escolher a versão do
 * runtime — sem ela, o comportamento depende de um default da plataforma que
 * pode não bater com `NodeNext`/ES2023 (tsconfig da API) nem com a versão
 * usada em desenvolvimento (`@types/node`). `.node-version` é o formato mais
 * amplamente reconhecido (Render, nvm, Vercel).
 */
describe('.node-version — declaração explícita de runtime para deploy', () => {
  it('existe na raiz do repositório', () => {
    const raw = readFileSync(path.join(__dirname, '../../../.node-version'), 'utf8')
    expect(raw.trim().length).toBeGreaterThan(0)
  })

  it('é um número de versão major válido (sem "v" na frente, sem sufixo)', () => {
    const raw = readFileSync(path.join(__dirname, '../../../.node-version'), 'utf8').trim()
    expect(raw).toMatch(/^\d+$/)
  })

  it('é compatível com a major usada por @types/node (mesma faixa de API do Node)', () => {
    const raw = readFileSync(path.join(__dirname, '../../../.node-version'), 'utf8').trim()
    const declaredMajor = Number(raw)

    const packageJson = JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf8')) as {
      devDependencies?: Record<string, string>
    }
    const typesNodeRange = packageJson.devDependencies?.['@types/node'] ?? ''
    const typesNodeMajor = Number(typesNodeRange.replace(/[^\d.]/g, '').split('.')[0])

    expect(declaredMajor).toBe(typesNodeMajor)
  })
})
