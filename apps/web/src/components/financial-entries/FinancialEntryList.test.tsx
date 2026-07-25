import { describe, expect, it } from 'vitest'
import { FIXTURE_CURRENT_PERIOD_ID, fixtureCategories, fixtureFinancialEntries } from '../../data/dashboard-fixtures.ts'
import { renderWithProviders, screen } from '../../test-utils.tsx'
import { FinancialEntryList } from './FinancialEntryList.tsx'

const currentEntries = fixtureFinancialEntries.filter((entry) => entry.periodId === FIXTURE_CURRENT_PERIOD_ID)

describe('FinancialEntryList — responsividade estrutural', () => {
  it('cada célula da tabela carrega data-label, o mecanismo que a CSS usa para empilhar em telas estreitas sem rolagem horizontal', () => {
    renderWithProviders(
      <FinancialEntryList entries={currentEntries} categories={fixtureCategories} onEdit={() => {}} onRealize={() => {}} onCancel={() => {}} />,
    )

    const cellsWithLabel = document.querySelectorAll('.fh-entry-list__table tbody td[data-label]')
    expect(cellsWithLabel.length).toBeGreaterThan(0)

    const expectedLabels = ['Descrição', 'Categoria', 'Tipo', 'Status', 'Previsto', 'Realizado', 'Vencimento', 'Realização', 'Responsável', 'Ações']
    const firstRowLabels = Array.from(document.querySelectorAll('.fh-entry-list__table tbody tr:first-child td')).map((cell) =>
      cell.getAttribute('data-label'),
    )
    expect(firstRowLabels).toEqual(expectedLabels)
  })

  it('renderiza uma linha por movimentação recebida', () => {
    renderWithProviders(
      <FinancialEntryList entries={currentEntries} categories={fixtureCategories} onEdit={() => {}} onRealize={() => {}} onCancel={() => {}} />,
    )
    const rows = screen.getAllByRole('row')
    // +1 pela linha de cabeçalho.
    expect(rows).toHaveLength(currentEntries.length + 1)
  })
})
