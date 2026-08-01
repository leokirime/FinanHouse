import type { FinanceContextValue } from '../state/finance-context.ts'
import type { FinanceReadyState } from '../state/finance-types.ts'
import { fireEvent, render, renderWithProviders, screen, within } from '../test-utils.tsx'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonPage } from './ComparisonPage.tsx'
import { FinanceContext } from '../state/finance-context.ts'
import { createTestFinanceState } from '../state/test-support/finance-test-fixtures.ts'

function renderWithState(state: FinanceReadyState) {
  const value: FinanceContextValue = { state, dispatch: vi.fn() }
  return render(
    <MemoryRouter initialEntries={['/comparativo']}>
      <FinanceContext.Provider value={value}>
        <ComparisonPage />
      </FinanceContext.Provider>
    </MemoryRouter>,
  )
}

describe('ComparisonPage', () => {
  it('renderiza seletores, indicadores e resumo acessível', () => {
    renderWithProviders(<ComparisonPage />, { initialEntries: ['/comparativo'] })
    expect(screen.getByLabelText('Período base')).toBeTruthy()
    expect(screen.getByLabelText('Período comparado')).toBeTruthy()
    expect(screen.getAllByText('Receitas realizadas').length).toBeGreaterThan(0)
    expect(screen.getByText('Comparação por categoria')).toBeTruthy()
    expect(screen.getAllByText('Indicadores lado a lado').length).toBeGreaterThan(0)
  })

  it('seleciona por padrão a competência atual e a imediatamente anterior', () => {
    renderWithProviders(<ComparisonPage />, { initialEntries: ['/comparativo'] })
    expect(screen.getByLabelText('Período base')).toHaveProperty('value', '7')
    expect(screen.getByLabelText('Período comparado')).toHaveProperty('value', '6')
  })

  it('impede que os dois seletores apontem para a mesma competência', () => {
    renderWithProviders(<ComparisonPage />, { initialEntries: ['/comparativo'] })
    const base = screen.getByLabelText('Período base')
    const compared = screen.getByLabelText('Período comparado')

    expect(within(base).getByRole('option', { name: /junho de 2026/i })).toHaveProperty('disabled', true)
    expect(within(compared).getByRole('option', { name: /julho de 2026/i })).toHaveProperty('disabled', true)
  })

  it('troca períodos mantendo seleções válidas', () => {
    renderWithProviders(<ComparisonPage />, { initialEntries: ['/comparativo'] })
    const base = screen.getByLabelText('Período base')
    const compared = screen.getByLabelText('Período comparado')

    fireEvent.change(base, { target: { value: '5' } })
    expect(base).toHaveProperty('value', '5')
    expect(compared).toHaveProperty('value', '6')

    fireEvent.change(compared, { target: { value: '4' } })
    expect(compared).toHaveProperty('value', '4')
  })

  it('renderiza estado vazio com menos de duas competências', () => {
    const state = createTestFinanceState()
    renderWithState({ ...state, periods: [state.periods[0]!], currentPeriodId: state.periods[0]!.id, previousPeriodId: state.periods[0]!.id })
    expect(screen.getByText('Comparativo indisponível')).toBeTruthy()
    expect(screen.getByText(/ao menos duas competências/)).toBeTruthy()
  })

  it('mantém navegação por teclado nos seletores nativos', () => {
    renderWithProviders(<ComparisonPage />, { initialEntries: ['/comparativo'] })
    const base = screen.getByLabelText('Período base') as HTMLSelectElement
    base.focus()
    expect(document.activeElement).toBe(base)
    fireEvent.keyDown(base, { key: 'ArrowDown' })
    expect(base.disabled).toBe(false)
  })

  it('não renderiza NaN ou Infinity', () => {
    renderWithProviders(<ComparisonPage />, { initialEntries: ['/comparativo'] })
    expect(document.body.textContent).not.toContain('NaN')
    expect(document.body.textContent).not.toContain('Infinity')
  })
})
