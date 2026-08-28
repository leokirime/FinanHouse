import type { FinancialEntry } from '@finanhouse/domain'
import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import {
  CATEGORY_FOOD,
  FIXTURE_CURRENT_PERIOD_ID,
  FIXTURE_HOUSEHOLD_ID,
  fixtureCategories,
  fixtureFinancialEntries,
} from '../../state/test-support/finance-test-fixtures.ts'
import { renderWithProviders, screen } from '../../test-utils.tsx'
import { FinancialEntryList } from './FinancialEntryList.tsx'

const currentEntries = fixtureFinancialEntries.filter((entry) => entry.periodId === FIXTURE_CURRENT_PERIOD_ID)

function installmentEntry(installmentNumber: number): FinancialEntry {
  return {
    id: 9900,
    householdId: FIXTURE_HOUSEHOLD_ID,
    periodId: FIXTURE_CURRENT_PERIOD_ID,
    categoryId: CATEGORY_FOOD,
    responsibleMemberId: null,
    createdByUserId: 1,
    entryType: 'expense',
    status: 'planned',
    description: 'Geladeira',
    expectedAmount: parseMoney('300.00'),
    actualAmount: null,
    dueDate: '2026-07-10',
    realizationDate: null,
    notes: null,
    installmentPlanId: 999,
    installmentNumber,
  }
}

describe('FinancialEntryList — responsividade estrutural', () => {
  it('cada célula da tabela carrega data-label, o mecanismo que a CSS usa para empilhar em telas estreitas sem rolagem horizontal', () => {
    renderWithProviders(
      <FinancialEntryList entries={currentEntries} categories={fixtureCategories} onEdit={() => {}} onRealize={() => {}} onDelete={() => {}} />,
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
      <FinancialEntryList entries={currentEntries} categories={fixtureCategories} onEdit={() => {}} onRealize={() => {}} onDelete={() => {}} />,
    )
    const rows = screen.getAllByRole('row')
    // +1 pela linha de cabeçalho.
    expect(rows).toHaveLength(currentEntries.length + 1)
  })
})

describe('FinancialEntryList — rótulo de parcela (Sessão 12, Bloco 06)', () => {
  it('exibe "Parcela N/Total" quando o total do plano é conhecido, sempre acompanhado da palavra "Parcela" (não depende só de cor)', () => {
    renderWithProviders(
      <FinancialEntryList
        entries={[installmentEntry(3)]}
        categories={fixtureCategories}
        onEdit={() => {}}
        onRealize={() => {}}
        onDelete={() => {}}
        installmentCountsByPlanId={new Map([[999, 10]])}
      />,
    )
    expect(document.querySelector('.fh-entry-list__installment-label')?.textContent).toContain('Parcela 3/10')
  })

  it('sem o mapa de totais, cai graciosamente para "Parcela N" — nunca inventa um total', () => {
    renderWithProviders(
      <FinancialEntryList entries={[installmentEntry(3)]} categories={fixtureCategories} onEdit={() => {}} onRealize={() => {}} onDelete={() => {}} />,
    )
    expect(document.querySelector('.fh-entry-list__installment-label')?.textContent).toContain('Parcela 3')
  })

  it('lançamento avulso não exibe nenhum indicador de parcela', () => {
    renderWithProviders(
      <FinancialEntryList entries={currentEntries} categories={fixtureCategories} onEdit={() => {}} onRealize={() => {}} onDelete={() => {}} />,
    )
    expect(document.querySelector('.fh-entry-list__installment-label')).toBeNull()
  })
})
