import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { fireEvent, render, renderWithProviders, screen, within } from '../test-utils.tsx'
import { FinanceDemoContext, type FinanceDemoContextValue } from '../state/finance-demo-context.ts'
import { createInitialFinanceDemoState } from '../state/finance-demo-initial-state.ts'
import type { FinanceDemoState } from '../state/finance-demo-types.ts'
import { PlanningPage } from './PlanningPage.tsx'

function renderWithState(state: FinanceDemoState) {
  const value: FinanceDemoContextValue = { state, dispatch: vi.fn() }
  return render(
    <MemoryRouter initialEntries={['/planejamento']}>
      <FinanceDemoContext.Provider value={value}>
        <PlanningPage />
      </FinanceDemoContext.Provider>
    </MemoryRouter>,
  )
}

describe('PlanningPage', () => {
  it('renderiza a página com título e indicador de modo demonstrativo', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByRole('heading', { name: 'Planejamento' })).toBeTruthy()
    expect(screen.getByText(/Modo demonstrativo/)).toBeTruthy()
  })

  it('seleciona por padrão a competência atual', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByLabelText('Competência')).toHaveProperty('value', '7')
  })

  it('mostra as categorias com status esperados vindos das fixtures', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getAllByText('Moradia').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Excedido').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Em atenção').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Saudável').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sem planejamento').length).toBeGreaterThan(0)
  })

  it('cria um novo limite através do formulário', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.click(screen.getAllByRole('button', { name: 'Definir limite' })[0]!)
    const dialog = within(screen.getByRole('dialog'))

    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '6' } }) // Lazer
    fireEvent.change(dialog.getByLabelText('Limite mensal'), { target: { value: '300.00' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Definir limite' }))

    expect(screen.getByText('Planejamento atualizado somente nesta sessão demonstrativa.')).toBeTruthy()
  })

  it('rejeita valor com mais de duas casas decimais no formulário', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.click(screen.getAllByRole('button', { name: 'Definir limite' })[0]!)
    const dialog = within(screen.getByRole('dialog'))

    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '6' } })
    fireEvent.change(dialog.getByLabelText('Limite mensal'), { target: { value: '10.999' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Definir limite' }))

    expect(screen.getByText(/Informe um valor válido/)).toBeTruthy()
  })

  it('edita um limite existente através da lista', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    const editButtons = screen.getAllByRole('button', { name: 'Editar limite' })
    fireEvent.click(editButtons[0]!)
    const dialog = within(screen.getByRole('dialog'))

    fireEvent.change(dialog.getByLabelText('Limite mensal'), { target: { value: '999.00' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Salvar alterações' }))

    expect(screen.getByText('Planejamento atualizado somente nesta sessão demonstrativa.')).toBeTruthy()
  })

  it('remove um limite temporariamente pela lista', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    const removeButtons = screen.getAllByRole('button', { name: 'Remover limite' })
    fireEvent.click(removeButtons[0]!)
    expect(screen.getByText('Planejamento atualizado somente nesta sessão demonstrativa.')).toBeTruthy()
  })

  it('categoria "sem planejamento" oferece ação de definir limite', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    const row = screen.getByText('Lazer').closest('tr')!
    expect(within(row).getByRole('button', { name: 'Definir limite' })).toBeTruthy()
  })

  it('mostra despesas planejadas e pendentes da competência selecionada', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByText('Despesas planejadas e pendentes')).toBeTruthy()
    expect(screen.getByText('Viagem de fim de semana (planejada)')).toBeTruthy()
    expect(screen.getByText('Parcela do seguro do carro')).toBeTruthy()
  })

  it('desabilita "Definir limite" ao visualizar uma competência diferente da atual', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '6' } })
    const newButton = screen.getAllByRole('button', { name: 'Definir limite' })[0] as HTMLButtonElement
    expect(newButton.disabled).toBe(true)
  })

  it('renderiza estado vazio quando não há nenhuma competência', () => {
    const state = createInitialFinanceDemoState()
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

  it('estrutura responsiva: células da tabela têm data-label para empilhamento em telas estreitas', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    const cell = document.querySelector('.fh-planning-table [data-label="Categoria"]')
    expect(cell).toBeTruthy()
  })

  it('o diálogo de limite tem papel acessível e fecha com Escape', () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.click(screen.getAllByRole('button', { name: 'Definir limite' })[0]!)
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
