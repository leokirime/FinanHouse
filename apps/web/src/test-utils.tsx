import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { FinanceDemoProvider } from './state/FinanceDemoProvider.tsx'

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
}

/** Envolve o componente testado com o roteador (em memória) e o estado demonstrativo — use sempre que o componente ou algum descendente usar `react-router-dom` ou `useFinanceDemo()`. */
export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const { initialEntries, ...renderOptions } = options
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries ?? ['/']}>
        <FinanceDemoProvider>{children}</FinanceDemoProvider>
      </MemoryRouter>
    ),
    ...renderOptions,
  })
}

// Padrão oficial do Testing Library para "custom render" — reexporta tudo de
// @testing-library/react para que os testes importem só deste arquivo.
// oxlint-disable-next-line react/only-export-components
export * from '@testing-library/react'
