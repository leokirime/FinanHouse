import { describe, expect, it } from 'vitest'
import { fireEvent, renderWithProviders, screen, within } from '../test-utils.tsx'
import { FinancialEntriesPage } from './FinancialEntriesPage.tsx'

describe('FinancialEntriesPage', () => {
  it('renderiza a página com título e indicador de modo demonstrativo', () => {
    renderWithProviders(<FinancialEntriesPage />)
    expect(screen.getByRole('heading', { name: 'Movimentações' })).toBeTruthy()
    expect(screen.getByText(/Modo demonstrativo/)).toBeTruthy()
  })

  it('lista as movimentações da competência atual', () => {
    renderWithProviders(<FinancialEntriesPage />)
    expect(screen.getByText('Salário — julho')).toBeTruthy()
  })

  it('mostra estado vazio quando a busca não encontra nada e permite limpar os filtros', () => {
    renderWithProviders(<FinancialEntriesPage />)
    const search = screen.getByPlaceholderText('Buscar por descrição ou categoria')
    fireEvent.change(search, { target: { value: 'termo inexistente xyz' } })

    expect(screen.getByText(/Nenhuma movimentação corresponde aos filtros/)).toBeTruthy()

    const clearButton = screen.getByRole('button', { name: 'Limpar filtros' })
    expect((clearButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(clearButton)

    expect(search).toHaveProperty('value', '')
    expect(screen.getByText('Salário — julho')).toBeTruthy()
  })

  it('cria uma nova movimentação através do formulário e atualiza a lista', () => {
    renderWithProviders(<FinancialEntriesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Nova movimentação' }))
    const dialog = within(screen.getByRole('dialog'))

    fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Presente de teste' } })
    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '4' } }) // Alimentação (expense por padrão)
    fireEvent.change(dialog.getByLabelText('Valor previsto'), { target: { value: '45.00' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Adicionar movimentação' }))

    expect(screen.getByText('Movimentação adicionada à sessão demonstrativa.')).toBeTruthy()
    expect(screen.getByText('Presente de teste')).toBeTruthy()
  })

  it('rejeita valor inválido no formulário sem despachar a criação', () => {
    renderWithProviders(<FinancialEntriesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Nova movimentação' }))
    const dialog = within(screen.getByRole('dialog'))

    fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Valor ruim' } })
    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '4' } })
    fireEvent.change(dialog.getByLabelText('Valor previsto'), { target: { value: 'abc' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Adicionar movimentação' }))

    expect(screen.getByText(/Informe um valor válido/)).toBeTruthy()
    expect(screen.queryByText('Valor ruim')).toBeNull()
  })
})
