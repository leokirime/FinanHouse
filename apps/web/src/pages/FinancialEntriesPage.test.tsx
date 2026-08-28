import { describe, expect, it } from 'vitest'
import type { FinanceReadyState } from '../state/finance-types.ts'
import { createTestFinanceState, FIXTURE_CURRENT_PERIOD_ID, FIXTURE_HOUSEHOLD_ID } from '../state/test-support/finance-test-fixtures.ts'
import { fireEvent, renderWithProviders, screen, within } from '../test-utils.tsx'
import { FinancialEntriesPage } from './FinancialEntriesPage.tsx'

describe('FinancialEntriesPage', () => {
  it('renderiza a página com título', () => {
    renderWithProviders(<FinancialEntriesPage />)
    expect(screen.getByRole('heading', { name: 'Movimentações' })).toBeTruthy()
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

    expect(screen.queryByRole('dialog')).toBeNull()
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

function rowFor(description: string): HTMLElement {
  const cell = screen.getByText(description)
  const row = cell.closest('tr')
  if (!row) throw new Error(`Linha da tabela não encontrada para "${description}".`)
  return row
}

describe('FinancialEntriesPage — exclusão real de lançamentos (Bloco 20)', () => {
  it('não oferece mais a ação "Cancelar" — "Excluir" aparece para planned/pending/realized', () => {
    renderWithProviders(<FinancialEntriesPage />)
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
    expect(within(rowFor('Viagem de fim de semana (planejada)')).getByRole('button', { name: 'Excluir' })).toBeTruthy()
  })

  it('oferece "Excluir" também para uma movimentação realizada, em competência aberta (ajuste pós-revisão do Bloco 20)', () => {
    renderWithProviders(<FinancialEntriesPage />)
    expect(within(rowFor('Salário — julho')).getByRole('button', { name: 'Excluir' })).toBeTruthy()
  })

  it('confirmar a exclusão de uma movimentação realizada remove da lista (ajuste pós-revisão do Bloco 20)', () => {
    renderWithProviders(<FinancialEntriesPage />)
    fireEvent.click(within(rowFor('Salário — julho')).getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir lançamento' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Salário — julho')).toBeNull()
    expect(screen.getByText(/Movimentação excluída/)).toBeTruthy()
  })

  it('não oferece "Excluir" para uma movimentação cancelada — reativação continua sendo o único caminho de volta', () => {
    renderWithProviders(<FinancialEntriesPage />)
    expect(within(rowFor('Consulta odontológica (cancelada)')).queryByRole('button', { name: 'Excluir' })).toBeNull()
    expect(within(rowFor('Consulta odontológica (cancelada)')).getByRole('button', { name: 'Reativar' })).toBeTruthy()
  })

  it('clicar em Excluir abre a confirmação, sem excluir imediatamente', () => {
    renderWithProviders(<FinancialEntriesPage />)
    fireEvent.click(within(rowFor('Viagem de fim de semana (planejada)')).getByRole('button', { name: 'Excluir' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Excluir lançamento?' })).toBeTruthy()
    expect(within(dialog).getByText(/removido permanentemente do HouseManager/)).toBeTruthy()
    expect(screen.getByText('Viagem de fim de semana (planejada)')).toBeTruthy()
  })

  it('"Voltar" fecha a confirmação sem excluir a movimentação', () => {
    renderWithProviders(<FinancialEntriesPage />)
    fireEvent.click(within(rowFor('Viagem de fim de semana (planejada)')).getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Viagem de fim de semana (planejada)')).toBeTruthy()
  })

  it('a tecla Escape fecha a confirmação sem excluir a movimentação', () => {
    renderWithProviders(<FinancialEntriesPage />)
    fireEvent.click(within(rowFor('Viagem de fim de semana (planejada)')).getByRole('button', { name: 'Excluir' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Viagem de fim de semana (planejada)')).toBeTruthy()
  })

  it('confirmar a exclusão remove a movimentação da lista e fecha a confirmação', () => {
    renderWithProviders(<FinancialEntriesPage />)
    fireEvent.click(within(rowFor('Viagem de fim de semana (planejada)')).getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir lançamento' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Viagem de fim de semana (planejada)')).toBeNull()
    expect(screen.getByText(/Movimentação excluída/)).toBeTruthy()
  })

  it('exclusão em competência fechada é rejeitada, mantém a movimentação e mostra o erro no diálogo', () => {
    const base = createTestFinanceState()
    const state: FinanceReadyState = {
      ...base,
      currentPeriodId: 1,
      entries: [
        ...base.entries,
        {
          id: 9999,
          householdId: FIXTURE_HOUSEHOLD_ID,
          periodId: 1,
          categoryId: base.categories.find((category) => category.entryType === 'expense')!.id,
          responsibleMemberId: null,
          createdByUserId: 1,
          entryType: 'expense',
          status: 'planned',
          description: 'Não deveria ser excluída',
          expectedAmount: 10000n,
          actualAmount: null,
          dueDate: null,
          realizationDate: null,
          notes: null,
          installmentPlanId: null,
          installmentNumber: null,
        },
      ],
    }
    renderWithProviders(<FinancialEntriesPage />, { financeState: state })

    fireEvent.click(within(rowFor('Não deveria ser excluída')).getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir lançamento' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Não deveria ser excluída')).toBeTruthy()
  })

  it('exclusão de uma movimentação realizada em competência fechada continua bloqueada (item 4 da correção pós-revisão)', () => {
    const base = createTestFinanceState()
    const state: FinanceReadyState = {
      ...base,
      currentPeriodId: 1,
      entries: [
        ...base.entries,
        {
          id: 9998,
          householdId: FIXTURE_HOUSEHOLD_ID,
          periodId: 1,
          categoryId: base.categories.find((category) => category.entryType === 'expense')!.id,
          responsibleMemberId: null,
          createdByUserId: 1,
          entryType: 'expense',
          status: 'realized',
          description: 'Realizada em competência fechada',
          expectedAmount: 10000n,
          actualAmount: 10000n,
          dueDate: null,
          realizationDate: '2026-01-05',
          notes: null,
          installmentPlanId: null,
          installmentNumber: null,
        },
      ],
    }
    renderWithProviders(<FinancialEntriesPage />, { financeState: state })

    fireEvent.click(within(rowFor('Realizada em competência fechada')).getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir lançamento' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Realizada em competência fechada')).toBeTruthy()
  })
})

describe('FinancialEntriesPage — independência entre parcelas de um mesmo plano (Sessão 12, Bloco 06)', () => {
  function siblingInstallment(id: number, installmentNumber: number, description: string) {
    return {
      id,
      householdId: FIXTURE_HOUSEHOLD_ID,
      periodId: FIXTURE_CURRENT_PERIOD_ID,
      categoryId: 4,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense' as const,
      status: 'planned' as const,
      description,
      expectedAmount: 30000n,
      actualAmount: null,
      dueDate: '2026-07-10',
      realizationDate: null,
      notes: null,
      installmentPlanId: 777,
      installmentNumber,
    }
  }

  it('realizar a parcela 2/3 não altera status, valor ou rótulo das parcelas irmãs 1/3 e 3/3', () => {
    const base = createTestFinanceState()
    const state: FinanceReadyState = {
      ...base,
      entries: [
        ...base.entries,
        siblingInstallment(9701, 1, 'Geladeira parcela 1'),
        siblingInstallment(9702, 2, 'Geladeira parcela 2'),
        siblingInstallment(9703, 3, 'Geladeira parcela 3'),
      ],
    }
    renderWithProviders(<FinancialEntriesPage />, { financeState: state })

    fireEvent.click(within(rowFor('Geladeira parcela 2')).getByRole('button', { name: 'Realizar' }))
    fireEvent.change(screen.getByLabelText('Data de realização'), { target: { value: '2026-07-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar realização' }))

    expect(screen.queryByRole('dialog')).toBeNull()

    const row2 = rowFor('Geladeira parcela 2')
    expect(within(row2).getByText('Realizado')).toBeTruthy()

    // Parcelas irmãs continuam "Planejado", com seu próprio valor previsto e sem terem sido tocadas.
    const row1 = rowFor('Geladeira parcela 1')
    expect(within(row1).getByText('Planejado')).toBeTruthy()
    expect(within(row1).getByRole('button', { name: 'Realizar' })).toBeTruthy()

    const row3 = rowFor('Geladeira parcela 3')
    expect(within(row3).getByText('Planejado')).toBeTruthy()
    expect(within(row3).getByRole('button', { name: 'Realizar' })).toBeTruthy()
  })
})
