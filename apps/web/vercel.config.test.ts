import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Sessão 14, Bloco 01 — remediação do bloqueador de deploy "SPA sem fallback"
 * identificado na auditoria pós-Sessão 12. `vercel.json` garante que um
 * refresh direto em uma rota do React Router (ex.: `/movimentacoes`) sirva
 * `index.html` em vez de 404 — mas NUNCA para `/api/*`, que não deve ser
 * capturado pelo fallback (isso mascararia uma API mal configurada como um
 * 200 de HTML em vez de um erro visível). O proxy real de `/api/*` para o
 * host da API ainda não é configurado aqui — depende do host escolhido em um
 * bloco futuro (ver `05_blocks/bloco_01_...md`, seção "Fora de Escopo").
 */
describe('apps/web/vercel.json — fallback de SPA', () => {
  function readVercelConfig(): { rewrites?: Array<{ source: string; destination: string }> } {
    const raw = readFileSync(path.join(__dirname, 'vercel.json'), 'utf8')
    return JSON.parse(raw)
  }

  it('existe e é um JSON válido', () => {
    expect(() => readVercelConfig()).not.toThrow()
  })

  it('tem um rewrite de fallback para index.html', () => {
    const config = readVercelConfig()
    const fallback = config.rewrites?.find((rule) => rule.destination === '/index.html')
    expect(fallback).toBeTruthy()
  })

  it('o rewrite de fallback nunca captura /api/*', () => {
    const config = readVercelConfig()
    const fallback = config.rewrites?.find((rule) => rule.destination === '/index.html')
    expect(fallback).toBeTruthy()
    // Vercel casa `source` contra o caminho inteiro, incluindo a barra inicial (âncora implícita) — reproduzido aqui com ^...$.
    const pattern = new RegExp(`^${fallback!.source}$`)
    expect(pattern.test('/api/v1/health')).toBe(false)
    expect(pattern.test('/movimentacoes')).toBe(true)
    expect(pattern.test('/movimentacoes/parcelamentos')).toBe(true)
  })

  it('nenhum rewrite aponta para localhost/127.0.0.1 (config real de deploy, nunca um destino de desenvolvimento)', () => {
    const config = readVercelConfig()
    for (const rule of config.rewrites ?? []) {
      expect(rule.destination).not.toMatch(/localhost|127\.0\.0\.1/)
    }
  })
})
