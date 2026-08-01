import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PeriodOverviewViewModel } from '../../view-models/dashboard-view-model.ts'
import { HeroBrand } from './HeroBrand.tsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const overview: PeriodOverviewViewModel = {
  referenceMonthLabel: 'julho de 2026',
  status: 'review',
  statusLabel: 'Em revisão',
  contextText: 'A competência está em revisão — confira as movimentações pendentes antes de fechar o mês.',
}

describe('HeroBrand', () => {
  it('renderiza a imagem oficial da logo como <img>, com o alt correto', () => {
    render(<HeroBrand overview={overview} />)
    const image = screen.getByRole('img', { name: 'Finanhouse — Casa, evolução e equilíbrio' })
    expect(image.tagName).toBe('IMG')
    expect(image.getAttribute('src')).toBeTruthy()
  })

  it('não renderiza a logo como imagem de fundo CSS', () => {
    render(<HeroBrand overview={overview} />)
    const image = screen.getByRole('img', { name: 'Finanhouse — Casa, evolução e equilíbrio' })
    expect((image as HTMLElement).style.backgroundImage).toBe('')
  })

  it('não recria o slogan como texto separado simulando a logo', () => {
    render(<HeroBrand overview={overview} />)
    // O slogan só deve existir dentro do atributo alt da imagem, nunca como nó de texto visível à parte.
    expect(screen.queryByText('Casa, evolução e equilíbrio')).toBeNull()
  })

  it('exibe a competência e o status a partir do overview recebido', () => {
    render(<HeroBrand overview={overview} />)
    expect(screen.getByText('Julho de 2026')).toBeTruthy()
    expect(screen.getByText('Em revisão')).toBeTruthy()
  })

  it('o CTA "Revisar mês" está realmente desabilitado (atributo disabled nativo)', () => {
    render(<HeroBrand overview={overview} />)
    const cta = screen.getByRole('button', { name: 'Revisar mês' }) as HTMLButtonElement
    expect(cta.disabled).toBe(true)
  })

  it('não referencia URL externa nem base64 no src da imagem', () => {
    render(<HeroBrand overview={overview} />)
    const image = screen.getByRole('img', { name: 'Finanhouse — Casa, evolução e equilíbrio' })
    const src = image.getAttribute('src') ?? ''
    expect(src.startsWith('http://')).toBe(false)
    expect(src.startsWith('https://')).toBe(false)
    expect(src.startsWith('data:')).toBe(false)
  })

  it('não existe mais o painel que reservava uma coluna própria para a imagem', () => {
    const { container } = render(<HeroBrand overview={overview} />)
    expect(container.querySelector('.fh-hero__brand-surface')).toBeNull()
  })

  it('a imagem carrega a classe de posicionamento decorativo (fh-hero__logo)', () => {
    render(<HeroBrand overview={overview} />)
    const image = screen.getByRole('img', { name: 'Finanhouse — Casa, evolução e equilíbrio' })
    expect(image.className).toContain('fh-hero__logo')
  })

  it('a descrição da competência é exibida junto do título e do status', () => {
    render(<HeroBrand overview={overview} />)
    expect(
      screen.getByText('A competência está em revisão — confira as movimentações pendentes antes de fechar o mês.'),
    ).toBeTruthy()
  })
})

describe('HeroBrand — posicionamento da marca (correção retrospectiva do Bloco 15: esquerda, não direita)', () => {
  function readHeroCss(): string {
    return readFileSync(path.join(__dirname, 'HeroBrand.css'), 'utf8')
  }

  /** Extrai o conteúdo do primeiro bloco de regra `.fh-hero__logo { ... }` (a regra base/desktop). */
  function extractBaseLogoRule(css: string): string {
    const match = /\.fh-hero__logo\s*\{([^}]*)\}/.exec(css)
    if (!match) throw new Error('Regra .fh-hero__logo não encontrada em HeroBrand.css.')
    return match[1] ?? ''
  }

  it('a regra base de .fh-hero__logo usa "left", nunca "right" (canto superior esquerdo)', () => {
    const baseRule = extractBaseLogoRule(readHeroCss())
    expect(baseRule).toMatch(/left:/)
    expect(baseRule).not.toMatch(/right:/)
  })

  it('nenhuma regra do arquivo posiciona a logo com "right" (nem desktop, nem breakpoints)', () => {
    const css = readHeroCss()
    // Verifica todos os blocos ".fh-hero__logo { ... }" do arquivo (base + media queries).
    const logoRules = [...css.matchAll(/\.fh-hero__logo\s*\{([^}]*)\}/g)].map((match) => match[1] ?? '')
    expect(logoRules.length).toBeGreaterThan(0)
    for (const rule of logoRules) {
      expect(rule).not.toMatch(/right:/)
    }
  })

  it('o conteúdo (.fh-hero__info) é deslocado para a direita da logo via margin-left, não apenas max-width', () => {
    const baseInfoMatch = /\.fh-hero__info\s*\{([^}]*)\}/.exec(readHeroCss())
    expect(baseInfoMatch).not.toBeNull()
    expect(baseInfoMatch?.[1]).toMatch(/margin-left:/)
  })

  it('no mobile (<=480px), a logo sai do posicionamento absoluto e volta ao fluxo normal, antes do conteúdo', () => {
    const css = readHeroCss()
    const mobileBlockMatch = /@media \(max-width: 480px\) \{([\s\S]*)\}\s*$/.exec(css)
    expect(mobileBlockMatch).not.toBeNull()
    const mobileBlock = mobileBlockMatch?.[1] ?? ''
    const mobileLogoRuleMatch = /\.fh-hero__logo\s*\{([^}]*)\}/.exec(mobileBlock)
    expect(mobileLogoRuleMatch).not.toBeNull()
    expect(mobileLogoRuleMatch?.[1]).toMatch(/position:\s*static/)
  })

  it('painel branco (.fh-hero__brand-surface) continua ausente após a correção de posição', () => {
    const { container } = render(<HeroBrand overview={overview} />)
    expect(container.querySelector('.fh-hero__brand-surface')).toBeNull()
  })

  it('a imagem da marca continua a mesma referência de asset (nenhuma edição/geração de imagem)', () => {
    render(<HeroBrand overview={overview} />)
    const image = screen.getByRole('img', { name: 'Finanhouse — Casa, evolução e equilíbrio' })
    expect(image.getAttribute('src')).toMatch(/finanhouse-logo-hero/)
  })

  it('título, descrição, status e ações continuam presentes após a correção de posição', () => {
    render(<HeroBrand overview={overview} />)
    expect(screen.getByText('Julho de 2026')).toBeTruthy()
    expect(
      screen.getByText('A competência está em revisão — confira as movimentações pendentes antes de fechar o mês.'),
    ).toBeTruthy()
    expect(screen.getByText('Em revisão')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Revisar mês' })).toBeTruthy()
  })
})
