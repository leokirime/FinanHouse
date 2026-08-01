import { describe, expect, it, vi } from 'vitest'
import { FIXTURE_CURRENT_PERIOD_ID, fixtureFinancialEntries } from '../../state/test-support/finance-test-fixtures.ts'
import { fireEvent, renderWithProviders, screen } from '../../test-utils.tsx'
import { RealizeEntryDialog } from './RealizeEntryDialog.tsx'

const pendingEntry = fixtureFinancialEntries.find((entry) => entry.periodId === FIXTURE_CURRENT_PERIOD_ID && entry.status === 'pending')!

describe('RealizeEntryDialog', () => {
  it('pré-preenche o valor realizado com o valor previsto, mas exige confirmação explícita', () => {
    renderWithProviders(<RealizeEntryDialog entry={pendingEntry} onClose={() => {}} />)
    const amountField = screen.getByLabelText('Valor realizado') as HTMLInputElement
    expect(amountField.value).not.toBe('')
    // Nada é despachado só por o campo já vir preenchido — precisa do submit.
    expect(screen.queryByText(/adicionada à sessão/)).toBeNull()
  })

  it('rejeita a realização sem valor', () => {
    renderWithProviders(<RealizeEntryDialog entry={pendingEntry} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Valor realizado'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Data de realização'), { target: { value: '2026-07-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar realização' }))

    expect(screen.getByText(/Informe um valor válido/)).toBeTruthy()
  })

  it('rejeita a realização sem data', () => {
    renderWithProviders(<RealizeEntryDialog entry={pendingEntry} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Valor realizado'), { target: { value: '120.00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar realização' }))

    expect(screen.getByText(/Informe a data em que a movimentação foi realizada/)).toBeTruthy()
  })

  it('realiza com sucesso quando valor e data são informados, fechando o diálogo', () => {
    const onClose = vi.fn()
    renderWithProviders(<RealizeEntryDialog entry={pendingEntry} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText('Valor realizado'), { target: { value: '120.00' } })
    fireEvent.change(screen.getByLabelText('Data de realização'), { target: { value: '2026-07-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar realização' }))

    expect(onClose).toHaveBeenCalled()
  })
})
