import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { fireEvent, render, renderWithProviders, screen, waitFor, within } from '../test-utils.tsx'
import { FinanceContext, type FinanceContextValue } from '../state/finance-context.ts'
import type { FinanceReadyState } from '../state/finance-types.ts'
import { AuthTestProvider } from '../state/test-support/AuthTestProvider.tsx'
import { createTestFinanceState } from '../state/test-support/finance-test-fixtures.ts'
import { PlanningPage } from './PlanningPage.tsx'

const HOUSEHOLD_ID = 1
const BASE_URL = 'http://127.0.0.1:3000'

interface StoredBudget {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  limitAmount: string
}

/** Fake em memória do endpoint `.../periods/:referenceMonth/budgets(/:categoryId)?` — nunca abre conexão real. */
function createBudgetsFetchMock(seed: StoredBudget[] = []) {
  const store = new Map<number, StoredBudget>(seed.map((budget) => [budget.id, budget]))
  let nextId = seed.reduce((max, budget) => Math.max(max, budget.id), 0) + 1

  const periodIdByReferenceMonth: Record<string, number> = { '2026-07-01': 7, '2026-06-01': 6 }

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }

  const fetchMock = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    const parsed = new URL(String(url))
    const match = parsed.pathname.match(/^\/api\/v1\/households\/(\d+)\/periods\/([\d-]+)\/budgets(?:\/(\d+))?$/)
    if (!match) throw new Error(`rota não mapeada no mock de teste: ${init.method ?? 'GET'} ${parsed.pathname}`)
    const [, householdIdRaw, referenceMonth, categoryIdRaw] = match
    const householdId = Number(householdIdRaw)
    const periodId = periodIdByReferenceMonth[referenceMonth!] ?? -1
    const method = init.method ?? 'GET'

    if (method === 'GET') {
      const data = [...store.values()].filter((budget) => budget.householdId === householdId && budget.periodId === periodId)
      return jsonResponse({ data })
    }

    const categoryId = Number(categoryIdRaw)

    if (method === 'PUT') {
      const body = JSON.parse(String(init.body)) as { limitAmount: string }
      const existing = [...store.values()].find((budget) => budget.householdId === householdId && budget.periodId === periodId && budget.categoryId === categoryId)
      if (existing) {
        const updated = { ...existing, limitAmount: body.limitAmount }
        store.set(existing.id, updated)
        return jsonResponse({ data: updated }, 200)
      }
      const created: StoredBudget = { id: nextId++, householdId, periodId, categoryId, limitAmount: body.limitAmount }
      store.set(created.id, created)
      return jsonResponse({ data: created }, 201)
    }

    if (method === 'DELETE') {
      const existing = [...store.values()].find((budget) => budget.householdId === householdId && budget.periodId === periodId && budget.categoryId === categoryId)
      if (!existing) return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Limite não encontrado.' } }, 404)
      store.delete(existing.id)
      return new Response(null, { status: 204 })
    }

    throw new Error(`método não mapeado: ${method}`)
  })

  return fetchMock
}

function renderWithState(state: FinanceReadyState) {
  const value: FinanceContextValue = { state, dispatch: vi.fn() }
  return render(
    <MemoryRouter initialEntries={['/planejamento']}>
      <AuthTestProvider>
        <FinanceContext.Provider value={value}>
          <PlanningPage />
        </FinanceContext.Provider>
      </AuthTestProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', BASE_URL)
  vi.stubEnv('VITE_FINANHOUSE_HOUSEHOLD_ID', String(HOUSEHOLD_ID))
  vi.stubGlobal('fetch', createBudgetsFetchMock())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('PlanningPage', () => {
  it('renderiza a página com título e descrição', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByRole('heading', { name: 'Planejamento' })).toBeTruthy()
    expect(screen.getByText(/Contas previstas e limites mensais/)).toBeTruthy()
  })

  it('seleciona por padrão a competência atual', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByLabelText('Competência')).toHaveProperty('value', '7')
  })

  it('mostra os cards de receita/despesa prevista e saldo projetado', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByText('Receita prevista')).toBeTruthy()
    expect(screen.getByText('Despesa prevista')).toBeTruthy()
    expect(screen.getByText('Saldo projetado')).toBeTruthy()
  })

  it('carrega os limites reais da API e mostra o resumo de limites', async () => {
    vi.stubGlobal(
      'fetch',
      createBudgetsFetchMock([{ id: 1, householdId: HOUSEHOLD_ID, periodId: 7, categoryId: 3, limitAmount: '2000.00' }]),
    )
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })

    await waitFor(() => expect(screen.getByText('Limite total')).toBeTruthy())
    expect(screen.getByText('Limites por categoria')).toBeTruthy()
    const totalCard = screen.getByText('Limite total').closest('article')!
    expect(within(totalCard).getByText('R$ 2.000,00')).toBeTruthy()
  })

  it('mostra a distribuição de despesas previstas por categoria (Moradia presente)', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    await waitFor(() => expect(screen.getByText('Limites por categoria')).toBeTruthy())
    expect(screen.getAllByText('Moradia').length).toBeGreaterThan(0)
  })

  it('define um novo limite através do formulário, persistindo na API real', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    await waitFor(() => expect(screen.getByText('Limites por categoria')).toBeTruthy())

    const row = screen.getByText('Moradia').closest('tr')!
    fireEvent.click(within(row).getByRole('button', { name: 'Definir limite' }))

    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Limite mensal'), { target: { value: '2500.00' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Definir limite' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(within(screen.getByText('Moradia').closest('tr')!).getByText('R$ 2.500,00')).toBeTruthy())
  })

  it('remove um limite existente pela lista', async () => {
    vi.stubGlobal(
      'fetch',
      createBudgetsFetchMock([{ id: 1, householdId: HOUSEHOLD_ID, periodId: 7, categoryId: 3, limitAmount: '2000.00' }]),
    )
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover limite' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Remover limite' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remover limite' })).toBeNull())
  })

  it('mostra receitas e despesas previstas/pendentes da competência selecionada', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    expect(screen.getByText('Receitas previstas')).toBeTruthy()
    expect(screen.getByText('Despesas previstas')).toBeTruthy()
    expect(screen.getByText('Viagem de fim de semana (planejada)')).toBeTruthy()
    expect(screen.getByText('Parcela do seguro do carro')).toBeTruthy()
    expect(screen.getByText('Projeto freelance (fatura enviada)')).toBeTruthy()
  })

  it('cria uma conta prevista através do formulário reaproveitado de Movimentações', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar conta prevista' }))
    const dialog = within(screen.getByRole('dialog'))

    fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Internet de agosto' } })
    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '3' } }) // Moradia
    fireEvent.change(dialog.getByLabelText('Valor previsto'), { target: { value: '120.00' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Adicionar movimentação' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Internet de agosto')).toBeTruthy()
  })

  it('desabilita "Adicionar conta prevista" ao visualizar uma competência diferente da atual', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '6' } })
    const newButton = screen.getByRole('button', { name: 'Adicionar conta prevista' }) as HTMLButtonElement
    expect(newButton.disabled).toBe(true)
  })

  it('renderiza estado vazio quando não há nenhuma competência', async () => {
    const state = createTestFinanceState()
    renderWithState({ ...state, periods: [] })
    expect(screen.getByText('Planejamento indisponível')).toBeTruthy()
  })

  it('mantém navegação por teclado no seletor de competência', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    const select = screen.getByLabelText('Competência') as HTMLSelectElement
    select.focus()
    expect(document.activeElement).toBe(select)
  })

  it('não renderiza NaN ou Infinity', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    await waitFor(() => expect(screen.getByText('Limites por categoria')).toBeTruthy())
    expect(document.body.textContent).not.toContain('NaN')
    expect(document.body.textContent).not.toContain('Infinity')
  })

  it('estrutura responsiva: células da tabela de limites têm data-label para empilhamento em telas estreitas', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    await waitFor(() => expect(document.querySelector('.fh-planning-table [data-label="Categoria"]')).toBeTruthy())
  })

  it('o diálogo de nova conta prevista tem papel acessível e fecha com Escape', async () => {
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar conta prevista' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('mostra erro explícito quando a API de limites está indisponível, sem bloquear o restante da página', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderWithProviders(<PlanningPage />, { initialEntries: ['/planejamento'] })

    await waitFor(() => expect(screen.getByText(/Não foi possível carregar os limites por categoria/)).toBeTruthy())
    // O restante da página (contas previstas) continua funcional mesmo com os limites indisponíveis.
    expect(screen.getByText('Receitas previstas')).toBeTruthy()
  })
})
