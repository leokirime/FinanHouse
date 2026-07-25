import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sidebar } from './Sidebar.tsx'

describe('Sidebar', () => {
  it('marca "Visão geral" como página atual', () => {
    render(<Sidebar />)
    const active = screen.getByRole('button', { name: 'Visão geral' })
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('marca as demais áreas como indisponíveis, sem aria-current', () => {
    render(<Sidebar />)
    for (const label of ['Movimentações', 'Comparativo', 'Planejamento', 'Histórico', 'Configurações']) {
      const item = screen.getByRole('button', { name: new RegExp(label) })
      expect(item.getAttribute('aria-disabled')).toBe('true')
      expect(item.hasAttribute('aria-current')).toBe(false)
    }
  })

  it('exibe o indicador de ambiente de demonstração', () => {
    render(<Sidebar />)
    expect(screen.getByText(/Dados simulados/)).toBeTruthy()
  })
})
