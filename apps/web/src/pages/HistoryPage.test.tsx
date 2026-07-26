import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { FinanceDemoContext, type FinanceDemoContextValue } from '../state/finance-demo-context.ts'
import { createInitialFinanceDemoState } from '../state/finance-demo-initial-state.ts'
import type { FinanceDemoState } from '../state/finance-demo-types.ts'
import { fireEvent, render, renderWithProviders, screen, within } from '../test-utils.tsx'
import { HistoryPage } from './HistoryPage.tsx'

function renderWithState(state: FinanceDemoState) {
  const value: FinanceDemoContextValue = { state, dispatch: vi.fn() }
  return render(
    <MemoryRouter initialEntries={['/historico']}>
      <FinanceDemoContext.Provider value={value}>
        <HistoryPage />
      </FinanceDemoContext.Provider>
    </MemoryRouter>,
  )
}

describe('HistoryPage', () => {
  it('renderiza a página com título e indicador de modo demonstrativo', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    expect(screen.getByRole('heading', { name: 'Histórico' })).toBeTruthy()
    expect(screen.getByText(/Modo demonstrativo/)).toBeTruthy()
  })

  it('lista as competências da mais recente para a mais antiga', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    const items = screen.getAllByRole('button').filter((button) => /de 202\d/.test(button.textContent ?? ''))
    expect(items[0]?.textContent).toContain('julho de 2026')
  })

  it('seleciona por padrão a competência mais recente', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    const selected = screen.getByRole('button', { name: /julho de 2026/ })
    expect(selected.getAttribute('aria-current')).toBe('true')
  })

  it('permite selecionar outra competência', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    fireEvent.click(screen.getByRole('button', { name: /junho de 2026/ }))
    expect(screen.getByRole('button', { name: /junho de 2026/ }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: /julho de 2026/ }).hasAttribute('aria-current')).toBe(false)
  })

  it('filtra por ano', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2025' } })
    expect(screen.queryByRole('button', { name: /julho de 2026/ })).toBeNull()
  })

  it('filtra por status da competência', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    fireEvent.change(screen.getByLabelText('Status da competência'), { target: { value: 'open' } })
    expect(screen.getByRole('button', { name: /julho de 2026/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /junho de 2026/ })).toBeNull()
  })

  it('filtra por status da movimentação', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    fireEvent.change(screen.getByLabelText('Status da movimentação'), { target: { value: 'cancelled' } })
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Cancelado').length).toBeGreaterThan(0)
    expect(within(table).queryByText('Realizado')).toBeNull()
  })

  it('limpa os filtros', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2025' } })
    const clearButton = screen.getByRole('button', { name: 'Limpar filtros' })
    expect((clearButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(clearButton)
    expect(screen.getByLabelText('Ano')).toHaveProperty('value', 'all')
    expect(screen.getByRole('button', { name: /julho de 2026/ })).toBeTruthy()
  })

  it('estado vazio quando não há nenhuma competência', () => {
    const state = createInitialFinanceDemoState()
    renderWithState({ ...state, periods: [] })
    expect(screen.getByText('Histórico indisponível')).toBeTruthy()
  })

  it('estado vazio quando os filtros não encontram nenhuma competência', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '1999' } })
    expect(screen.getByText('Nenhuma competência encontrada')).toBeTruthy()
  })

  it('mostra receitas realizadas, despesas realizadas, saldo realizado e fechamento projetado', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    expect(screen.getByText('Receitas realizadas')).toBeTruthy()
    expect(screen.getByText('Despesas realizadas')).toBeTruthy()
    expect(screen.getByText('Saldo realizado')).toBeTruthy()
    expect(screen.getByText('Fechamento projetado')).toBeTruthy()
  })

  it('mostra a contagem de movimentações por status (planned/pending/realized/cancelled)', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    expect(screen.getByText('Planejadas')).toBeTruthy()
    expect(screen.getByText('Pendentes')).toBeTruthy()
    expect(screen.getByText('Realizadas')).toBeTruthy()
    expect(screen.getByText('Canceladas')).toBeTruthy()
  })

  it('lista as movimentações da competência selecionada', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    expect(screen.getByText('Salário — julho')).toBeTruthy()
  })

  it('não oferece nenhuma ação de editar ou excluir movimentações', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    expect(screen.queryByRole('button', { name: /editar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /excluir/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /cancelar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /realizar/i })).toBeNull()
  })

  it('não renderiza NaN ou Infinity', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    expect(document.body.textContent).not.toContain('NaN')
    expect(document.body.textContent).not.toContain('Infinity')
  })

  it('datas exibidas em pt-BR', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    expect(screen.getAllByText(/\d{2} de \w{3}\.?/).length).toBeGreaterThan(0)
  })

  it('mantém navegação por teclado na lista de competências', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    const button = screen.getByRole('button', { name: /junho de 2026/ }) as HTMLButtonElement
    button.focus()
    expect(document.activeElement).toBe(button)
  })

  it('estrutura responsiva: células da tabela têm data-label para empilhamento em telas estreitas', () => {
    renderWithProviders(<HistoryPage />, { initialEntries: ['/historico'] })
    const cell = document.querySelector('.fh-history-table td[data-label="Descrição"]')
    expect(cell).toBeTruthy()
  })
})
