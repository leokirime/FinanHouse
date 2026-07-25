import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sidebar } from './Sidebar.tsx'

describe('Sidebar', () => {
  it('marca "Visão geral" como página atual e habilitada', () => {
    render(<Sidebar />)
    const active = screen.getByRole('button', { name: 'Visão geral' })
    expect(active.getAttribute('aria-current')).toBe('page')
    expect((active as HTMLButtonElement).disabled).toBe(false)
  })

  it('marca as demais áreas como indisponíveis (disabled nativo), sem aria-current', () => {
    render(<Sidebar />)
    for (const label of ['Movimentações', 'Comparativo', 'Planejamento', 'Histórico', 'Configurações']) {
      const item = screen.getByRole('button', { name: new RegExp(label) }) as HTMLButtonElement
      expect(item.disabled).toBe(true)
      expect(item.hasAttribute('aria-current')).toBe(false)
    }
  })

  it('exibe o indicador de ambiente de demonstração', () => {
    render(<Sidebar />)
    expect(screen.getByText(/Dados simulados/)).toBeTruthy()
  })
})
