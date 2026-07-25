import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RecentEntryViewModel } from '../../view-models/dashboard-view-model.ts'
import { RecentEntries } from './RecentEntries.tsx'

const entries: RecentEntryViewModel[] = [
  {
    id: 1,
    description: 'Salário — julho',
    categoryName: 'Salário',
    entryType: 'income',
    status: 'realized',
    statusLabel: 'Realizado',
    dateLabel: '05 de jul.',
    amountLabel: 'R$ 8.750,00',
  },
  {
    id: 2,
    description: 'Consulta odontológica (cancelada)',
    categoryName: 'Saúde',
    entryType: 'expense',
    status: 'cancelled',
    statusLabel: 'Cancelado',
    dateLabel: '15 de jul.',
    amountLabel: '-R$ 450,00',
  },
]

describe('RecentEntries', () => {
  it('lista as movimentações recebidas, com categoria e status', () => {
    render(<RecentEntries entries={entries} />)
    expect(screen.getByText('Salário — julho')).toBeTruthy()
    expect(screen.getByText('Realizado')).toBeTruthy()
    expect(screen.getByText('Cancelado')).toBeTruthy()
  })

  it('nunca renderiza NaN ou Infinity', () => {
    render(<RecentEntries entries={entries} />)
    expect(document.body.textContent).not.toContain('NaN')
    expect(document.body.textContent).not.toContain('Infinity')
  })
})
