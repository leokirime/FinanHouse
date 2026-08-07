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

  it('não exibe mais o botão "Nova movimentação" no header (Bloco 20 — redundante com a navegação da Sidebar)', () => {
    renderHeader()
    expect(screen.queryByRole('button', { name: 'Nova movimentação' })).toBeNull()
  })
})
