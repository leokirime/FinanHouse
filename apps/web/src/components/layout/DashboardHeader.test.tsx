import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardHeader } from './DashboardHeader.tsx'

describe('DashboardHeader', () => {
  it('exibe título, competência e status', () => {
    render(<DashboardHeader areaTitle="Visão geral" periodLabel="julho de 2026" statusLabel="Em revisão" />)
    expect(screen.getByRole('heading', { name: 'Visão geral' })).toBeTruthy()
    expect(screen.getByText('julho de 2026')).toBeTruthy()
    expect(screen.getByText('Em revisão')).toBeTruthy()
  })

  it('o CTA "Nova movimentação" está realmente desabilitado (atributo disabled nativo)', () => {
    render(<DashboardHeader areaTitle="Visão geral" periodLabel="julho de 2026" statusLabel="Em revisão" />)
    const cta = screen.getByRole('button', { name: 'Nova movimentação' }) as HTMLButtonElement
    expect(cta.disabled).toBe(true)
  })

  it('não simula sucesso ao clicar no CTA desabilitado', () => {
    render(<DashboardHeader areaTitle="Visão geral" periodLabel="julho de 2026" statusLabel="Em revisão" />)
    const cta = screen.getByRole('button', { name: 'Nova movimentação' })
    cta.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(screen.queryByText(/salv/i)).toBeNull()
  })
})
