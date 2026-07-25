import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PeriodOverviewViewModel } from '../../view-models/dashboard-view-model.ts'
import { HeroBrand } from './HeroBrand.tsx'

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
})
