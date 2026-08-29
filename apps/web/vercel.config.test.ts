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
 * 200 de HTML em vez de um erro visível).
 *
 * Sessão 14, Bloco 03 (FASE C) — com o Render Free já provisionado e
 * validado (`/health`/`/ready` reais), o proxy `/api/*` para o host real da
 * API é configurado como PRIMEIRA regra de `rewrites`, antes do fallback de
 * SPA — Vercel casa regras em ordem, a primeira que bater vence. Preserva a
 * arquitetura same-origin: o navegador só fala com o domínio da Vercel; o
 * encaminhamento para o Render acontece no edge da Vercel, nunca visível ao
 * cliente (cookie de sessão nunca cruza origem).
 */
describe('apps/web/vercel.json — proxy /api/* e fallback de SPA', () => {
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

  it('tem um rewrite de /api/:path* para o host real do Render, com protocolo HTTPS', () => {
    const config = readVercelConfig()
    const apiRewrite = config.rewrites?.find((rule) => rule.source === '/api/:path*')
    expect(apiRewrite).toBeTruthy()
    expect(apiRewrite!.destination).toBe('https://finanhouse.onrender.com/api/:path*')
    expect(apiRewrite!.destination.startsWith('https://')).toBe(true)
  })

  it('a regra de /api/* vem ANTES do fallback de SPA (ordem determina qual regra vence)', () => {
    const config = readVercelConfig()
    const rewrites = config.rewrites ?? []
    const apiIndex = rewrites.findIndex((rule) => rule.source === '/api/:path*')
    const fallbackIndex = rewrites.findIndex((rule) => rule.destination === '/index.html')
    expect(apiIndex).toBeGreaterThanOrEqual(0)
    expect(fallbackIndex).toBeGreaterThanOrEqual(0)
    expect(apiIndex).toBeLessThan(fallbackIndex)
  })

  it('o destino do proxy de API nunca é um placeholder/URL fictícia (é uma URL absoluta e resolvível)', () => {
    const config = readVercelConfig()
    const apiRewrite = config.rewrites?.find((rule) => rule.source === '/api/:path*')
    expect(apiRewrite).toBeTruthy()
    // `:path*` é sintaxe de parâmetro do Vercel, não regex — validamos a URL
    // substituindo o parâmetro por um segmento de exemplo antes de `new URL()`.
    const resolvedSample = apiRewrite!.destination.replace(':path*', 'v1/health')
    expect(() => new URL(resolvedSample)).not.toThrow()
    const url = new URL(resolvedSample)
    expect(url.protocol).toBe('https:')
    expect(url.hostname).not.toMatch(/localhost|127\.0\.0\.1/)
  })
})
