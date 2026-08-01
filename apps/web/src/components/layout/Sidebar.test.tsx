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

  it('marca "Histórico" como link real, habilitado, sem aria-current fora da sua rota', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/'] })
    const history = screen.getByRole('link', { name: 'Histórico' })
    expect(history.getAttribute('href')).toBe('/historico')
    expect(history.hasAttribute('aria-current')).toBe(false)
  })

  it('marca "Histórico" com aria-current="page" quando a rota ativa é /historico', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/historico'] })
    const history = screen.getByRole('link', { name: 'Histórico' })
    expect(history.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Visão geral' }).hasAttribute('aria-current')).toBe(false)
  })

  it('marca as demais áreas como indisponíveis (disabled nativo), sem aria-current', () => {
    renderWithProviders(<Sidebar />)
    for (const label of ['Configurações']) {
      const item = screen.getByRole('button', { name: new RegExp(label) }) as HTMLButtonElement
      expect(item.disabled).toBe(true)
      expect(item.hasAttribute('aria-current')).toBe(false)
    }
  })

  it('renderiza a marca institucional (imagem real) no topo, antes dos itens de navegação', () => {
    const { container } = renderWithProviders(<Sidebar />)
    const image = screen.getByRole('img', { name: 'Finanhouse' })
    expect(image.getAttribute('src')).toMatch(/finanhouse-logo-hero/)

    // Ordem no DOM: a marca (dentro de .fh-sidebar__brand) vem antes de .fh-sidebar__nav.
    const brandBlock = container.querySelector('.fh-sidebar__brand')
    const navBlock = container.querySelector('.fh-sidebar__nav')
    expect(brandBlock).not.toBeNull()
    expect(navBlock).not.toBeNull()
    const position = brandBlock!.compareDocumentPosition(navBlock!)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a marca institucional é um link acessível para a visão geral ("/")', () => {
    renderWithProviders(<Sidebar />)
    const brandLink = screen.getByRole('link', { name: 'Ir para a visão geral do FinanHouse' })
    expect(brandLink.getAttribute('href')).toBe('/')
  })

  it('a marca da sidebar usa a variante "sidebar" (dimensionamento próprio), não a classe absoluta do hero', () => {
    const { container } = renderWithProviders(<Sidebar />)
    expect(container.querySelector('.fh-brand[data-size="sidebar"]')).not.toBeNull()
    expect(container.querySelector('.fh-hero__logo')).toBeNull()
  })

  it('não existe painel branco (fh-hero__brand-surface, herdado do antigo hero) na sidebar', () => {
    const { container } = renderWithProviders(<Sidebar />)
    expect(container.querySelector('.fh-hero__brand-surface')).toBeNull()
  })
})
