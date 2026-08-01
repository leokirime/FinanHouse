import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import type { FinanceState } from './state/finance-types.ts'
import { FinanceTestProvider } from './state/test-support/FinanceTestProvider.tsx'

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  /** Estado financeiro inicial — padrão: fixtures de teste com `status: 'ready'` (ver `finance-test-fixtures.ts`). */
  financeState?: FinanceState
}

/** Envolve o componente testado com o roteador (em memória) e o estado financeiro de teste — use sempre que o componente ou algum descendente usar `react-router` ou `useFinance()`/`useReadyFinance()`. */
export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const { initialEntries, financeState, ...renderOptions } = options
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries ?? ['/']}>
        <FinanceTestProvider initialState={financeState}>{children}</FinanceTestProvider>
      </MemoryRouter>
    ),
    ...renderOptions,
  })
}

// Padrão oficial do Testing Library para "custom render" — reexporta tudo de
// @testing-library/react para que os testes importem só deste arquivo.
// oxlint-disable-next-line react/only-export-components
export * from '@testing-library/react'
