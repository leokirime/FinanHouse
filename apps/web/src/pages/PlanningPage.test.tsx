import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { fireEvent, render, renderWithProviders, screen, within } from '../test-utils.tsx'
import { FinanceContext, type FinanceContextValue } from '../state/finance-context.ts'
import type { FinanceReadyState } from '../state/finance-types.ts'
import { createTestFinanceState } from '../state/test-support/finance-test-fixtures.ts'
import { PlanningPage } from './PlanningPage.tsx'

function renderWithState(state: FinanceReadyState) {
  const value: FinanceContextValue = { state, dispatch: vi.fn() }
  return render(
    <MemoryRouter initialEntries={['/planejamento']}>
      <FinanceContext.Provider value={value}>
        <PlanningPage />
      </FinanceContext.Provider>
    </MemoryRouter>,
  )
}

describe('PlanningPage', () => {
  it('renderiza a página com título e descrição', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByRole('heading', { name: 'Planejamento' })).toBeTruthy()
    expect(screen.getByText(/Contas previstas da competência/)).toBeTruthy()
  })

  it('seleciona por padrão a competência atual', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByLabelText('Competência')).toHaveProperty('value', '7')
  })

  it('mostra os cards de receita/despesa prevista e saldo projetado', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByText('Receita prevista')).toBeTruthy()
    expect(screen.getByText('Despesa prevista')).toBeTruthy()
    expect(screen.getByText('Saldo projetado')).toBeTruthy()
  })

  it('mostra a distribuição de despesas previstas por categoria com aviso sobre limites futuros', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByText('Despesas previstas por categoria')).toBeTruthy()
    expect(screen.getAllByText('Moradia').length).toBeGreaterThan(0)
    expect(screen.getByText(/Limites por categoria serão adicionados em uma próxima evolução/)).toBeTruthy()
  })

  it('nunca mostra rótulos de status de limite (healthy/attention/exceeded não existem mais nesta página)', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.queryByText('Excedido')).toBeNull()
    expect(screen.queryByText('Em atenção')).toBeNull()
    expect(screen.queryByText('Saudável')).toBeNull()
  })

  it('mostra receitas e despesas previstas/pendentes da competência selecionada', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByText('Receitas previstas')).toBeTruthy()
    expect(screen.getByText('Despesas previstas')).toBeTruthy()
    expect(screen.getByText('Viagem de fim de semana (planejada)')).toBeTruthy()
    expect(screen.getByText('Parcela do seguro do carro')).toBeTruthy()
    expect(screen.getByText('Projeto freelance (fatura enviada)')).toBeTruthy()
  })

  it('cria uma conta prevista através do formulário reaproveitado de Movimentações', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar conta prevista' }))
    const dialog = within(screen.getByRole('dialog'))

    fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Internet de agosto' } })
    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '3' } }) // Moradia
    fireEvent.change(dialog.getByLabelText('Valor previsto'), { target: { value: '120.00' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Adicionar movimentação' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Internet de agosto')).toBeTruthy()
  })

  it('desabilita "Adicionar conta prevista" ao visualizar uma competência diferente da atual', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '6' } })
    const newButton = screen.getByRole('button', { name: 'Adicionar conta prevista' }) as HTMLButtonElement
    expect(newButton.disabled).toBe(true)
  })

  it('renderiza estado vazio quando não há nenhuma competência', () => {
    const state = createTestFinanceState()
    renderWithState({ ...state, periods: [] })
    expect(screen.getByText('Planejamento indisponível')).toBeTruthy()
  })

  it('mantém navegação por teclado no seletor de competência', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    const select = screen.getByLabelText('Competência') as HTMLSelectElement
    select.focus()
    expect(document.activeElement).toBe(select)
  })

  it('não renderiza NaN ou Infinity', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(document.body.textContent).not.toContain('NaN')
    expect(document.body.textContent).not.toContain('Infinity')
  })

  it('estrutura responsiva: células da tabela de distribuição têm data-label para empilhamento em telas estreitas', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    const cell = document.querySelector('.fh-planning-table [data-label="Categoria"]')
    expect(cell).toBeTruthy()
  })

  it('o diálogo de nova conta prevista tem papel acessível e fecha com Escape', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar conta prevista' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
