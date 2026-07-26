import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../test-utils.tsx'
import { Sidebar } from './Sidebar.tsx'

describe('Sidebar', () => {
  it('marca "Visão geral" como página atual (link real, rota "/")', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/'] })
    const active = screen.getByRole('link', { name: 'Visão geral' })
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('marca "Movimentações" como link real, habilitado, sem aria-current fora da sua rota', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/'] })
    const entries = screen.getByRole('link', { name: 'Movimentações' })
    expect(entries.getAttribute('href')).toBe('/movimentacoes')
    expect(entries.hasAttribute('aria-current')).toBe(false)
  })

  it('marca "Movimentações" com aria-current="page" quando a rota ativa é /movimentacoes', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/movimentacoes'] })
    const entries = screen.getByRole('link', { name: 'Movimentações' })
    expect(entries.getAttribute('aria-current')).toBe('page')
    const overview = screen.getByRole('link', { name: 'Visão geral' })
    expect(overview.hasAttribute('aria-current')).toBe(false)
  })

  it('marca "Comparativo" como link real, habilitado, sem aria-current fora da sua rota', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/'] })
    const comparison = screen.getByRole('link', { name: 'Comparativo' })
    expect(comparison.getAttribute('href')).toBe('/comparativo')
    expect(comparison.hasAttribute('aria-current')).toBe(false)
  })

  it('marca "Comparativo" com aria-current="page" quando a rota ativa é /comparativo', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/comparativo'] })
    const comparison = screen.getByRole('link', { name: 'Comparativo' })
    expect(comparison.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Visão geral' }).hasAttribute('aria-current')).toBe(false)
  })

  it('marca "Planejamento" como link real, habilitado, sem aria-current fora da sua rota', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/'] })
    const planning = screen.getByRole('link', { name: 'Planejamento' })
    expect(planning.getAttribute('href')).toBe('/planejamento')
    expect(planning.hasAttribute('aria-current')).toBe(false)
  })

  it('marca "Planejamento" com aria-current="page" quando a rota ativa é /planejamento', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/planejamento'] })
    const planning = screen.getByRole('link', { name: 'Planejamento' })
    expect(planning.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Visão geral' }).hasAttribute('aria-current')).toBe(false)
  })

  it('marca as demais áreas como indisponíveis (disabled nativo), sem aria-current', () => {
    renderWithProviders(<Sidebar />)
    for (const label of ['Histórico', 'Configurações']) {
      const item = screen.getByRole('button', { name: new RegExp(label) }) as HTMLButtonElement
      expect(item.disabled).toBe(true)
      expect(item.hasAttribute('aria-current')).toBe(false)
    }
  })

  it('exibe o indicador de ambiente de demonstração', () => {
    renderWithProviders(<Sidebar />)
    expect(screen.getByText(/Dados simulados/)).toBeTruthy()
  })
})
