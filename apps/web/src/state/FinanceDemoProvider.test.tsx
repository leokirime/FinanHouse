import { act } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '../test-utils.tsx'
import { useFinanceDemo } from '../hooks/use-finance-demo.ts'
import { FinanceDemoProvider } from './FinanceDemoProvider.tsx'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'

/** Rastreia UMA movimentação específica (pelo id capturado na primeira renderização) — "a atual planned" mudaria de significado assim que ela deixasse de ser planned. */
function Probe() {
  const { state, dispatch } = useFinanceDemo()
  const trackedIdRef = useRef<number | null>(null)
  if (trackedIdRef.current === null) {
    const planned = state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'planned')
    trackedIdRef.current = planned?.id ?? null
  }
  const tracked = state.entries.find((entry) => entry.id === trackedIdRef.current)

  return (
    <div>
      <span data-testid="entries-count">{state.entries.length}</span>
      <span data-testid="planned-status">{tracked?.status}</span>
      <button
        type="button"
        onClick={() => trackedIdRef.current !== null && dispatch({ type: 'MARK_PENDING', id: trackedIdRef.current })}
      >
        mudar status
      </button>
    </div>
  )
}

describe('FinanceDemoProvider', () => {
  it('inicializa com o mesmo número de movimentações das fixtures', () => {
    render(
      <FinanceDemoProvider>
        <Probe />
      </FinanceDemoProvider>,
    )
    expect(screen.getByTestId('entries-count').textContent).toBe(String(createInitialFinanceDemoState().entries.length))
  })

  it('reinicia para o estado das fixtures quando o provider é remontado (equivalente a recarregar a página)', () => {
    const { unmount } = render(
      <FinanceDemoProvider>
        <Probe />
      </FinanceDemoProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'mudar status' }).click()
    })
    expect(screen.getByTestId('planned-status').textContent).toBe('pending')

    unmount()

    render(
      <FinanceDemoProvider>
        <Probe />
      </FinanceDemoProvider>,
    )
    expect(screen.getByTestId('planned-status').textContent).toBe('planned')
  })
})
