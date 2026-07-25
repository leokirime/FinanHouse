import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { UpcomingEntryViewModel } from '../../view-models/dashboard-view-model.ts'
import { UpcomingEntries } from './UpcomingEntries.tsx'

const entries: UpcomingEntryViewModel[] = [
  {
    id: 1,
    description: 'Parcela do seguro do carro',
    categoryName: 'Transporte',
    dueDateLabel: '27 de jul.',
    amountLabel: '-R$ 380,00',
  },
]

describe('UpcomingEntries', () => {
  it('lista pendências próximas com descrição e vencimento', () => {
    render(<UpcomingEntries entries={entries} />)
    expect(screen.getByText('Parcela do seguro do carro')).toBeTruthy()
    expect(screen.getByText(/vence em 27 de jul\./)).toBeTruthy()
  })

  it('mostra mensagem clara quando não há pendências', () => {
    render(<UpcomingEntries entries={[]} />)
    expect(screen.getByText('Nenhuma pendência com vencimento próximo.')).toBeTruthy()
  })
})
