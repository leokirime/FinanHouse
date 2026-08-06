import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthTestProvider } from '../../state/test-support/AuthTestProvider.tsx'
import { DashboardHeader } from './DashboardHeader.tsx'

function renderHeader() {
  return render(
    <AuthTestProvider>
      <DashboardHeader areaTitle="Visão geral" periodLabel="julho de 2026" statusLabel="Em revisão" />
    </AuthTestProvider>,
  )
}

describe('DashboardHeader', () => {
  it('exibe título, competência e status', () => {
    renderHeader()
    expect(screen.getByRole('heading', { name: 'Visão geral' })).toBeTruthy()
    expect(screen.getByText('julho de 2026')).toBeTruthy()
    expect(screen.getByText('Em revisão')).toBeTruthy()
  })

  it('exibe o nome da usuária autenticada e um botão de sair', () => {
    renderHeader()
    expect(screen.getByText('Usuária de Teste')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy()
  })

  it('o CTA "Nova movimentação" está realmente desabilitado (atributo disabled nativo)', () => {
    renderHeader()
    const cta = screen.getByRole('button', { name: 'Nova movimentação' }) as HTMLButtonElement
    expect(cta.disabled).toBe(true)
  })

  it('não simula sucesso ao clicar no CTA desabilitado', () => {
    renderHeader()
    const cta = screen.getByRole('button', { name: 'Nova movimentação' })
    cta.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(screen.queryByText(/salv/i)).toBeNull()
  })
})
