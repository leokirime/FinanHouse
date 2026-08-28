import { parseMoney, type FinancialEntry } from '@finanhouse/domain'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReadyFinance } from '../hooks/use-finance.ts'
import type { FinanceReadyState } from '../state/finance-types.ts'
import { createTestFinanceState, FIXTURE_CURRENT_PERIOD_ID, FIXTURE_HOUSEHOLD_ID } from '../state/test-support/finance-test-fixtures.ts'
import { fireEvent, renderWithProviders, screen, waitFor, within } from '../test-utils.tsx'
import { InstallmentPlansPage } from './InstallmentPlansPage.tsx'

const HOUSEHOLD_ID = 1
const BASE_URL = 'http://127.0.0.1:3000'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const PLAN_DTO = {
  id: 1,
  householdId: HOUSEHOLD_ID,
  description: 'Sofá',
  categoryId: 3,
  totalAmount: '3000.00',
  installmentCount: 10,
  firstReferenceMonth: '2026-08-01',
  dueDay: 10,
  createdByUserId: 100,
  createdAt: '2026-08-24T10:00:00.000Z',
}

function installmentDto(number: number, status = 'planned') {
  return {
    id: 100 + number,
    householdId: HOUSEHOLD_ID,
    periodId: 7,
    categoryId: 3,
    responsibleMemberId: null,
    createdByUserId: 100,
    entryType: 'expense',
    status,
    description: `Sofá ${number}/10`,
    expectedAmount: '300.00',
    actualAmount: status === 'realized' ? '300.00' : null,
    dueDate: `2026-${String(8 + number - 1).padStart(2, '0')}-10`,
    realizationDate: status === 'realized' ? `2026-${String(8 + number - 1).padStart(2, '0')}-10` : null,
    notes: null,
    installmentPlanId: 1,
    installmentNumber: number,
  }
}

const ALL_INSTALLMENTS = Array.from({ length: 10 }, (_, index) => installmentDto(index + 1, index === 0 ? 'realized' : 'planned'))

interface RouteMap {
  [key: string]: (init: RequestInit) => Response | Promise<Response>
}

function createFetchMock(routes: RouteMap) {
  return vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    const parsed = new URL(String(url))
    const key = `${init.method ?? 'GET'} ${parsed.pathname}${parsed.search}`
    const handler = routes[key]
    if (!handler) throw new Error(`Rota não mapeada no mock de teste: ${key}`)
    return handler(init)
  })
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', BASE_URL)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function renderPage(routes: RouteMap) {
  vi.stubGlobal('fetch', createFetchMock(routes))
  return renderWithProviders(<InstallmentPlansPage />, {
    initialEntries: ['/movimentacoes/parcelamentos'],
    financeState: createTestFinanceState(),
  })
}

describe('InstallmentPlansPage — estado vazio', () => {
  it('GET real devolvendo [] mostra o estado vazio, sem nenhum dado fictício', async () => {
    renderPage({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }) })

    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    expect(screen.queryByText('Sofá')).toBeNull()
    expect(document.body.textContent).not.toMatch(/celular|geladeira mockada/i)
  })

  it('o CTA do estado vazio abre o formulário de criação', async () => {
    renderPage({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }) })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())

    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('InstallmentPlansPage — listagem', () => {
  it('lista um parcelamento real vindo da API', async () => {
    renderPage({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [PLAN_DTO] }) })
    await waitFor(() => expect(screen.getByText('Sofá')).toBeTruthy())
    expect(screen.getByText('R$ 3.000,00')).toBeTruthy()
    expect(screen.getByText('10x')).toBeTruthy()
  })

  it('selecionar um plano existente busca e mostra suas parcelas reais via GET detail', async () => {
    renderPage({
      'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [PLAN_DTO] }),
      'GET /api/v1/households/1/installment-plans/1': () => jsonResponse({ data: { plan: PLAN_DTO, installments: ALL_INSTALLMENTS } }),
    })
    await waitFor(() => expect(screen.getByText('Sofá')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Sofá' }))

    await waitFor(() => expect(screen.getByText('1/10')).toBeTruthy())
    expect(screen.getByText('10/10')).toBeTruthy()
    expect(screen.getAllByText('R$ 300,00').length).toBeGreaterThan(0)
    expect(screen.getByText('Realizado')).toBeTruthy()
    expect(screen.getAllByText('Planejado').length).toBe(9)
  })
})

describe('InstallmentPlansPage — formulário de criação', () => {
  it('usa categorias reais de despesa do household no select — nunca digitação livre de categoryId', async () => {
    renderPage({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }) })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

    const dialog = within(screen.getByRole('dialog'))
    const select = dialog.getByLabelText('Categoria') as HTMLSelectElement
    const optionLabels = Array.from(select.options).map((option) => option.textContent)
    expect(optionLabels).toContain('Moradia')
    expect(optionLabels).toContain('Alimentação')
    expect(optionLabels).not.toContain('Salário') // categoria de receita nunca aparece
  })

  it.each(['abc', '3000.00', '3,000.00', '3000,0', '3000,000'])(
    'rejeita valor monetário inválido/não pt-BR ("%s") sem chamar a API',
    async (invalidValue) => {
      const fetchMock = createFetchMock({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }) })
      vi.stubGlobal('fetch', fetchMock)
      renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState: createTestFinanceState() })
      await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
      fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

      const dialog = within(screen.getByRole('dialog'))
      fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Sofá' } })
      fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '3' } })
      fireEvent.change(dialog.getByLabelText('Valor total'), { target: { value: invalidValue } })
      fireEvent.change(dialog.getByLabelText('Número de parcelas'), { target: { value: '10' } })
      fireEvent.change(dialog.getByLabelText('Primeira competência'), { target: { value: '2026-08' } })
      fireEvent.change(dialog.getByLabelText('Dia do vencimento'), { target: { value: '10' } })
      fireEvent.click(dialog.getByRole('button', { name: 'Criar parcelamento' }))

      expect(screen.getByText('Informe um valor válido em reais (ex.: 3000,00).')).toBeTruthy()
      expect(fetchMock).toHaveBeenCalledTimes(1) // só o GET inicial — nenhum POST disparado
    },
  )

  it.each([
    ['1000,50', '1000.50'],
    ['3.000,00', '3000.00'],
  ])('converte "%s" (formato pt-BR) para "%s" (contrato HTTP) no corpo do POST', async (typedValue, expectedPayloadAmount) => {
    renderPage({
      'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }),
      'POST /api/v1/households/1/installment-plans': async (init) => {
        const body = JSON.parse(init.body as string)
        expect(body.totalAmount).toBe(expectedPayloadAmount)
        return jsonResponse({ data: { plan: PLAN_DTO, installments: ALL_INSTALLMENTS } }, 201)
      },
    })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Sofá' } })
    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '3' } })
    fireEvent.change(dialog.getByLabelText('Valor total'), { target: { value: typedValue } })
    fireEvent.change(dialog.getByLabelText('Número de parcelas'), { target: { value: '10' } })
    fireEvent.change(dialog.getByLabelText('Primeira competência'), { target: { value: '2026-08' } })
    fireEvent.change(dialog.getByLabelText('Dia do vencimento'), { target: { value: '10' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Criar parcelamento' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('a prévia funciona digitando vírgula — 3000,00 em 10x mostra aproximadamente R$ 300,00', async () => {
    renderPage({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }) })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Valor total'), { target: { value: '3000,00' } })
    fireEvent.change(dialog.getByLabelText('Número de parcelas'), { target: { value: '10' } })

    expect(screen.getByText(/aproximadamente R\$ 300,00/)).toBeTruthy()
  })

  it('placeholder do campo de valor usa formato pt-BR ("0,00"), nunca ponto', async () => {
    renderPage({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }) })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

    const dialog = within(screen.getByRole('dialog'))
    expect((dialog.getByLabelText('Valor total') as HTMLInputElement).placeholder).toBe('0,00')
  })

  it('installmentCount = 1 é rejeitado pelo atributo min do input (mínimo formal é 2)', async () => {
    renderPage({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }) })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

    const dialog = within(screen.getByRole('dialog'))
    const countInput = dialog.getByLabelText('Número de parcelas') as HTMLInputElement
    expect(countInput.min).toBe('2')
    expect(countInput.max).toBe('') // nenhum máximo arbitrário
  })

  it('submissão válida: chama POST real, fecha o formulário, atualiza a lista e mostra o parcelamento recém-criado', async () => {
    let listCallCount = 0
    renderPage({
      'GET /api/v1/households/1/installment-plans': () => {
        listCallCount += 1
        return jsonResponse({ data: listCallCount === 1 ? [] : [PLAN_DTO] })
      },
      'POST /api/v1/households/1/installment-plans': async (init) => {
        const body = JSON.parse(init.body as string)
        expect(body.description).toBe('Sofá')
        expect(body.totalAmount).toBe('3000.00')
        expect(body.installmentCount).toBe(10)
        expect(body.firstReferenceMonth).toBe('2026-08-01')
        expect(body.dueDay).toBe(10)
        expect(body).not.toHaveProperty('householdId')
        expect(body).not.toHaveProperty('createdByUserId')
        return jsonResponse({ data: { plan: PLAN_DTO, installments: ALL_INSTALLMENTS } }, 201)
      },
    })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Sofá' } })
    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '3' } })
    fireEvent.change(dialog.getByLabelText('Valor total'), { target: { value: '3000,00' } }) // formato pt-BR digitado pelo usuário
    fireEvent.change(dialog.getByLabelText('Número de parcelas'), { target: { value: '10' } })
    fireEvent.change(dialog.getByLabelText('Primeira competência'), { target: { value: '2026-08' } })
    fireEvent.change(dialog.getByLabelText('Dia do vencimento'), { target: { value: '10' } })

    expect(screen.getByText(/aproximadamente R\$ 300,00/)).toBeTruthy() // prévia visual antes de salvar, calculada a partir da vírgula digitada

    fireEvent.click(dialog.getByRole('button', { name: 'Criar parcelamento' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(screen.getAllByText('Sofá').length).toBeGreaterThan(0))
    // parcelamento recém-criado é mostrado com suas parcelas reais retornadas pela API
    expect(screen.getByText('1/10')).toBeTruthy()
    expect(screen.getByText('10/10')).toBeTruthy()
  })

  it('erro do backend (categoria de outro household) mostra mensagem sanitizada, sem detalhe interno', async () => {
    renderPage({
      'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }),
      'POST /api/v1/households/1/installment-plans': () =>
        jsonResponse({ error: { code: 'DOMAIN_CONFLICT', message: 'Categoria não pertence a este household.' } }, 409),
    })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Sofá' } })
    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '3' } })
    fireEvent.change(dialog.getByLabelText('Valor total'), { target: { value: '3000,00' } })
    fireEvent.change(dialog.getByLabelText('Número de parcelas'), { target: { value: '10' } })
    fireEvent.change(dialog.getByLabelText('Primeira competência'), { target: { value: '2026-08' } })
    fireEvent.change(dialog.getByLabelText('Dia do vencimento'), { target: { value: '10' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Criar parcelamento' }))

    await waitFor(() => expect(screen.getByText('Categoria não pertence a este household.')).toBeTruthy())
    expect(document.body.textContent).not.toMatch(/SQL|stack|Aiven|mysql:\/\//i)
    expect(screen.getByRole('dialog')).toBeTruthy() // continua aberto para correção

    // acessibilidade: o erro geral do formulário é associado ao <form> via aria-describedby (mesmo padrão de FinancialEntryForm)
    const errorParagraph = screen.getByRole('alert')
    const form = dialog.getByRole('button', { name: 'Criar parcelamento' }).closest('form')!
    expect(form.getAttribute('aria-describedby')).toBe(errorParagraph.id)
  })

  it('mostra estado de carregamento e bloqueia duplo envio durante a submissão', async () => {
    let resolvePost!: (value: Response) => void
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve
    })

    renderPage({
      'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }),
      'POST /api/v1/households/1/installment-plans': () => postPromise,
    })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo parcelamento' })[0])

    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Descrição'), { target: { value: 'Sofá' } })
    fireEvent.change(dialog.getByLabelText('Categoria'), { target: { value: '3' } })
    fireEvent.change(dialog.getByLabelText('Valor total'), { target: { value: '3000,00' } })
    fireEvent.change(dialog.getByLabelText('Número de parcelas'), { target: { value: '10' } })
    fireEvent.change(dialog.getByLabelText('Primeira competência'), { target: { value: '2026-08' } })
    fireEvent.change(dialog.getByLabelText('Dia do vencimento'), { target: { value: '10' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Criar parcelamento' }))

    await waitFor(() => expect(dialog.getByRole('button', { name: 'Salvando…' })).toBeTruthy())
    expect((dialog.getByRole('button', { name: 'Salvando…' }) as HTMLButtonElement).disabled).toBe(true)

    resolvePost(jsonResponse({ data: { plan: PLAN_DTO, installments: ALL_INSTALLMENTS } }, 201))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('InstallmentPlansPage — sub-navegação', () => {
  it('a aba "Lançamentos" leva de volta para /movimentacoes', async () => {
    renderPage({ 'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }) })
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento cadastrado.')).toBeTruthy())

    const tab = screen.getByRole('link', { name: 'Parcelamentos' })
    expect(tab.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Lançamentos' })).toBeTruthy()
  })
})

/**
 * Ajuste pós-validação visual do Bloco 06: separar parcelamentos ainda
 * ativos dos totalmente concluídos, sem excluir plano/parcela e sem
 * persistir nenhum status novo — "concluído" é só `realizedCount ===
 * installmentCount`, recalculado a cada renderização a partir de
 * `state.entries` (FinanceProvider).
 */
function planDto(id: number, description: string) {
  return { ...PLAN_DTO, id, description }
}

function installmentEntry(planId: number, installmentNumber: number, status: FinancialEntry['status'], periodId = FIXTURE_CURRENT_PERIOD_ID): FinancialEntry {
  return {
    id: planId * 1000 + installmentNumber,
    householdId: FIXTURE_HOUSEHOLD_ID,
    periodId,
    categoryId: 3,
    responsibleMemberId: null,
    createdByUserId: 100,
    entryType: 'expense',
    status,
    description: `Plano ${planId} parcela ${installmentNumber}`,
    expectedAmount: parseMoney('300.00'),
    actualAmount: status === 'realized' ? parseMoney('300.00') : null,
    dueDate: '2026-07-10',
    realizationDate: status === 'realized' ? '2026-07-10' : null,
    notes: null,
    installmentPlanId: planId,
    installmentNumber,
  }
}

function installmentsFor(planId: number, realizedCount: number, total: number): FinancialEntry[] {
  return Array.from({ length: total }, (_, index) =>
    installmentEntry(planId, index + 1, index < realizedCount ? 'realized' : 'planned'),
  )
}

/** Harness de teste: expõe o dispatch real do FinanceProvider para simular, dentro do mesmo teste, uma FinancialEntry sendo realizada em outra tela (Movimentações) — sem precisar montar duas rotas ao mesmo tempo. */
function RealizeTrigger({ entryId }: { entryId: number }) {
  const { dispatch } = useReadyFinance()
  return (
    <button type="button" onClick={() => dispatch({ type: 'REALIZE', id: entryId, actualAmount: parseMoney('300.00'), realizationDate: '2026-07-20' })}>
      Realizar via teste
    </button>
  )
}

describe('InstallmentPlansPage — separação entre em andamento e concluídos (ajuste pós-validação visual do Bloco 06)', () => {
  it('ao entrar na página, o filtro padrão é "Em andamento"', async () => {
    const base = createTestFinanceState()
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...installmentsFor(1, 3, 10)] }
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: [planDto(1, 'Geladeira')] })))
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Geladeira')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Em andamento' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Concluídos' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('um plano concluído (10/10) não aparece em "Em andamento", só em "Concluídos" e "Todos"', async () => {
    const base = createTestFinanceState()
    const financeState: FinanceReadyState = {
      ...base,
      entries: [...base.entries, ...installmentsFor(1, 3, 10), ...installmentsFor(2, 10, 10)],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ data: [planDto(1, 'Geladeira'), planDto(2, 'Sofá')] })),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Geladeira')).toBeTruthy())
    expect(screen.queryByText('Sofá')).toBeNull() // concluído, fora da visão padrão

    fireEvent.click(screen.getByRole('button', { name: 'Concluídos' }))
    expect(screen.getByText('Sofá')).toBeTruthy()
    expect(screen.queryByText('Geladeira')).toBeNull() // ainda em andamento, fora de "Concluídos"
    expect(within(screen.getByText('Sofá').closest('tr')!).getByText('Concluído')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(screen.getByText('Geladeira')).toBeTruthy()
    expect(screen.getByText('Sofá')).toBeTruthy()
  })

  it('estado vazio específico: "Nenhum parcelamento em andamento." quando só existem planos concluídos', async () => {
    const base = createTestFinanceState()
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...installmentsFor(1, 10, 10)] }
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: [planDto(1, 'Geladeira')] })))
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Nenhum parcelamento em andamento.')).toBeTruthy())
    expect(screen.getAllByRole('button', { name: 'Novo parcelamento' }).length).toBeGreaterThan(0)
  })

  it('estado vazio específico: "Nenhum parcelamento concluído." quando só existem planos em andamento, sem repetir o CTA', async () => {
    const base = createTestFinanceState()
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...installmentsFor(1, 3, 10)] }
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: [planDto(1, 'Geladeira')] })))
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })
    await waitFor(() => expect(screen.getByText('Geladeira')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Concluídos' }))
    expect(screen.getByText('Nenhum parcelamento concluído.')).toBeTruthy()
    // CTA "Novo parcelamento" continua existindo só no cabeçalho da página, não duplicado no estado vazio de "Concluídos".
    expect(screen.getAllByRole('button', { name: 'Novo parcelamento' })).toHaveLength(1)
  })

  it('transição automática: ao realizar a última parcela (9/10 → 10/10), o plano sai de "Em andamento" e passa a "Concluídos" — sem persistir status', async () => {
    const base = createTestFinanceState()
    const entries = installmentsFor(1, 9, 10) // parcela 10 ainda "planned"
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...entries] }
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: [planDto(1, 'Geladeira')] })))

    renderWithProviders(
      <>
        <RealizeTrigger entryId={1010} />
        <InstallmentPlansPage />
      </>,
      { initialEntries: ['/movimentacoes/parcelamentos'], financeState },
    )

    await waitFor(() => expect(screen.getByText('Geladeira')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Concluídos' }))
    expect(screen.getByText('Nenhum parcelamento concluído.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Em andamento' }))
    expect(screen.getByText('Geladeira')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Realizar via teste' }))

    // Ainda na aba "Em andamento": o plano, agora 10/10, desaparece automaticamente.
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento em andamento.')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Concluídos' }))
    expect(screen.getByText('Geladeira')).toBeTruthy()
  })

  it('acessibilidade: os três filtros são navegáveis/identificáveis via aria-pressed, nunca só por cor', async () => {
    const base = createTestFinanceState()
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...installmentsFor(1, 3, 10)] }
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: [planDto(1, 'Geladeira')] })))
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })
    await waitFor(() => expect(screen.getByText('Geladeira')).toBeTruthy())

    const activeButton = screen.getByRole('button', { name: 'Em andamento' })
    const completedButton = screen.getByRole('button', { name: 'Concluídos' })
    const allButton = screen.getByRole('button', { name: 'Todos' })
    expect(activeButton.getAttribute('aria-pressed')).toBe('true')
    expect(completedButton.getAttribute('aria-pressed')).toBe('false')
    expect(allButton.getAttribute('aria-pressed')).toBe('false')

    completedButton.focus()
    expect(document.activeElement).toBe(completedButton)
    fireEvent.click(completedButton)
    expect(completedButton.getAttribute('aria-pressed')).toBe('true')
    expect(activeButton.getAttribute('aria-pressed')).toBe('false')
  })

  it('selecionar um plano concluído a partir de "Concluídos" continua abrindo o detalhe completo (histórico preservado)', async () => {
    const base = createTestFinanceState()
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...installmentsFor(1, 10, 10)] }
    const planDtoValue = planDto(1, 'Geladeira')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname
        if (path.endsWith('/installment-plans')) return jsonResponse({ data: [planDtoValue] })
        return jsonResponse({
          data: { plan: planDtoValue, installments: Array.from({ length: 10 }, (_, index) => installmentDto(index + 1, 'realized')) },
        })
      }),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Nenhum parcelamento em andamento.')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Concluídos' }))
    await waitFor(() => expect(screen.getByText('Geladeira')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Geladeira' }))
    await waitFor(() => expect(screen.getByText('1/10')).toBeTruthy())
    expect(screen.getByText('10/10')).toBeTruthy()
  })
})

/**
 * Ajuste pós-validação visual: integração Parcelamentos ↔ Lançamentos —
 * "Marcar como pago" no detalhe do parcelamento realiza a MESMA
 * FinancialEntry (mesmo id/installmentPlanId/installmentNumber), reutilizando
 * o RealizeEntryDialog já existente. Nunca depende da competência
 * atualmente exibida na página (`currentPeriodId`) — só da competência
 * própria da parcela.
 */
function installmentDetailDto(planId: number, number: number, status: string, periodId: number, referenceMonthIndex: number) {
  return {
    id: planId * 1000 + number,
    householdId: HOUSEHOLD_ID,
    periodId,
    categoryId: 3,
    responsibleMemberId: null,
    createdByUserId: 100,
    entryType: 'expense',
    status,
    description: `Plano ${planId} parcela ${number}`,
    expectedAmount: '112.50',
    actualAmount: status === 'realized' ? '112.50' : null,
    dueDate: `2026-${String(referenceMonthIndex).padStart(2, '0')}-15`,
    realizationDate: status === 'realized' ? `2026-${String(referenceMonthIndex).padStart(2, '0')}-15` : null,
    notes: null,
    installmentPlanId: planId,
    installmentNumber: number,
  }
}

describe('InstallmentPlansPage — realizar parcela a partir do detalhe do parcelamento (integração Parcelamentos ↔ Lançamentos)', () => {
  it('"Marcar como pago" realiza a MESMA FinancialEntry — sem criar lançamento novo, id/installmentPlanId/installmentNumber preservados', async () => {
    const base = createTestFinanceState()
    const planId = 5
    const entries = [
      installmentEntry(planId, 1, 'planned'),
      installmentEntry(planId, 2, 'planned'),
      installmentEntry(planId, 3, 'planned'),
      installmentEntry(planId, 4, 'planned'),
    ]
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...entries] }
    const planDtoValue = { ...planDto(planId, 'Placa de vídeo'), installmentCount: 4 }
    let detailCallCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname
        if (path.endsWith('/installment-plans')) return jsonResponse({ data: [planDtoValue] })
        detailCallCount += 1
        const parcela1Status = detailCallCount === 1 ? 'planned' : 'realized'
        return jsonResponse({
          data: {
            plan: planDtoValue,
            installments: [
              installmentDetailDto(planId, 1, parcela1Status, FIXTURE_CURRENT_PERIOD_ID, 7),
              installmentDetailDto(planId, 2, 'planned', FIXTURE_CURRENT_PERIOD_ID, 8),
              installmentDetailDto(planId, 3, 'planned', FIXTURE_CURRENT_PERIOD_ID, 9),
              installmentDetailDto(planId, 4, 'planned', FIXTURE_CURRENT_PERIOD_ID, 10),
            ],
          },
        })
      }),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Placa de vídeo')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Placa de vídeo' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Marcar parcela 1 de 4 como paga/ })).toBeTruthy())

    // Antes: 0 de 4 realizadas.
    expect(screen.getByText('0 de 4 parcelas realizadas')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Marcar parcela 1 de 4 como paga/ }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Data de realização'), { target: { value: '2026-07-20' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Confirmar realização' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // Progresso na LISTA (derivado de state.entries, atualizado pelo dispatch REALIZE real do FinanceProvider de teste).
    await waitFor(() => expect(screen.getByText('1 de 4 parcelas realizadas')).toBeTruthy())
    // Nenhuma nova linha — ainda 4 parcelas no detalhe (buscado de novo via retry()), a mesma parcela 1 agora "Realizado".
    await waitFor(() => expect(screen.queryByRole('button', { name: /Marcar parcela 1 de 4 como paga/ })).toBeNull())
    expect(screen.getByRole('button', { name: /Marcar parcela 2 de 4 como paga/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Marcar parcela 3 de 4 como paga/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Marcar parcela 4 de 4 como paga/ })).toBeTruthy()
  })

  it('parcela de competência diferente da atualmente exibida (setembro, com a página em julho) pode ser realizada normalmente', async () => {
    const base = createTestFinanceState()
    const planId = 6
    const SEPTEMBER_PERIOD_ID = 900
    const septemberPeriod = { id: SEPTEMBER_PERIOD_ID, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-09-01', status: 'open' as const, closedAt: null, closedByUserId: null }
    const entries = [installmentEntry(planId, 1, 'planned', SEPTEMBER_PERIOD_ID)]
    const financeState: FinanceReadyState = {
      ...base, // currentPeriodId continua julho (FIXTURE_CURRENT_PERIOD_ID)
      periods: [...base.periods, septemberPeriod],
      entries: [...base.entries, ...entries],
    }
    const planDtoValue = { ...planDto(planId, 'Placa de vídeo'), installmentCount: 1 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname
        if (path.endsWith('/installment-plans')) return jsonResponse({ data: [planDtoValue] })
        return jsonResponse({ data: { plan: planDtoValue, installments: [installmentDetailDto(planId, 1, 'planned', SEPTEMBER_PERIOD_ID, 9)] } })
      }),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Placa de vídeo')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Placa de vídeo' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Marcar parcela 1 de 1 como paga/ })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /Marcar parcela 1 de 1 como paga/ }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Data de realização'), { target: { value: '2026-09-15' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Confirmar realização' }))

    // Sucesso mesmo com a página exibindo julho — a operação usa a competência da própria parcela (setembro), não currentPeriodId.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a última parcela realizada (3/4 → 4/4) faz o plano sair de "Em andamento" e aparecer em "Concluídos"', async () => {
    const base = createTestFinanceState()
    const planId = 7
    const entries = [
      installmentEntry(planId, 1, 'realized'),
      installmentEntry(planId, 2, 'realized'),
      installmentEntry(planId, 3, 'realized'),
      installmentEntry(planId, 4, 'planned'),
    ]
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...entries] }
    const planDtoValue = { ...planDto(planId, 'Placa de vídeo'), installmentCount: 4 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname
        if (path.endsWith('/installment-plans')) return jsonResponse({ data: [planDtoValue] })
        return jsonResponse({
          data: {
            plan: planDtoValue,
            installments: [
              installmentDetailDto(planId, 1, 'realized', FIXTURE_CURRENT_PERIOD_ID, 7),
              installmentDetailDto(planId, 2, 'realized', FIXTURE_CURRENT_PERIOD_ID, 8),
              installmentDetailDto(planId, 3, 'realized', FIXTURE_CURRENT_PERIOD_ID, 9),
              installmentDetailDto(planId, 4, 'planned', FIXTURE_CURRENT_PERIOD_ID, 10),
            ],
          },
        })
      }),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Placa de vídeo')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Placa de vídeo' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Marcar parcela 4 de 4 como paga/ })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /Marcar parcela 4 de 4 como paga/ }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Data de realização'), { target: { value: '2026-10-15' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Confirmar realização' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Plano concluído (4/4) some de "Em andamento" automaticamente — sem nenhum status persistido.
    await waitFor(() => expect(screen.getByText('Nenhum parcelamento em andamento.')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Concluídos' }))
    // "Placa de vídeo" aparece tanto na linha da lista quanto no cabeçalho do detalhe ainda aberto.
    expect(screen.getAllByText('Placa de vídeo').length).toBeGreaterThan(0)
  })

  it('uma parcela já realizada não exibe "Marcar como pago" — nenhum pagamento duplicado é possível pela UI', async () => {
    const base = createTestFinanceState()
    const planId = 8
    const entries = [installmentEntry(planId, 1, 'realized')]
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...entries] }
    const planDtoValue = { ...planDto(planId, 'Placa de vídeo'), installmentCount: 1 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname
        if (path.endsWith('/installment-plans')) return jsonResponse({ data: [planDtoValue] })
        return jsonResponse({ data: { plan: planDtoValue, installments: [installmentDetailDto(planId, 1, 'realized', FIXTURE_CURRENT_PERIOD_ID, 7)] } })
      }),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Nenhum parcelamento em andamento.')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Concluídos' }))
    await waitFor(() => expect(screen.getByText('Placa de vídeo')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Placa de vídeo' }))
    await waitFor(() => expect(screen.getByText('Realizado')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /Marcar como pago/ })).toBeNull()
  })

  it('erro ao realizar (competência fechada) mantém a parcela como não realizada, mostra erro sanitizado e não fecha o diálogo', async () => {
    const base = createTestFinanceState()
    const planId = 9
    const CLOSED_PERIOD_ID = 1 // já fechado nas fixtures
    const entries = [installmentEntry(planId, 1, 'planned', CLOSED_PERIOD_ID)]
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...entries] }
    const planDtoValue = { ...planDto(planId, 'Placa de vídeo'), installmentCount: 1 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname
        if (path.endsWith('/installment-plans')) return jsonResponse({ data: [planDtoValue] })
        return jsonResponse({ data: { plan: planDtoValue, installments: [installmentDetailDto(planId, 1, 'planned', CLOSED_PERIOD_ID, 1)] } })
      }),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Placa de vídeo')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Placa de vídeo' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Marcar parcela 1 de 1 como paga/ })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /Marcar parcela 1 de 1 como paga/ }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Data de realização'), { target: { value: '2026-01-15' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Confirmar realização' }))

    expect(screen.getByRole('dialog')).toBeTruthy() // continua aberto
    const errorMessage = screen.getByRole('alert')
    expect(errorMessage.textContent).toMatch(/competência fechada/)
    expect(document.body.textContent).not.toMatch(/SQL|stack|Aiven|mysql:\/\//i)
    // Progresso continua "0 de 1" — nenhum incremento indevido.
    expect(screen.getByText('0 de 1 parcelas realizadas')).toBeTruthy()
  })

  it('acessibilidade: o botão "Marcar como pago" tem nome acessível específico por parcela', async () => {
    const base = createTestFinanceState()
    const planId = 10
    const entries = [installmentEntry(planId, 1, 'planned'), installmentEntry(planId, 2, 'planned')]
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...entries] }
    const planDtoValue = { ...planDto(planId, 'Placa de vídeo'), installmentCount: 2 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname
        if (path.endsWith('/installment-plans')) return jsonResponse({ data: [planDtoValue] })
        return jsonResponse({
          data: {
            plan: planDtoValue,
            installments: [
              installmentDetailDto(planId, 1, 'planned', FIXTURE_CURRENT_PERIOD_ID, 7),
              installmentDetailDto(planId, 2, 'planned', FIXTURE_CURRENT_PERIOD_ID, 8),
            ],
          },
        })
      }),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Placa de vídeo')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Placa de vídeo' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Marcar parcela 1 de 2 como paga' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Marcar parcela 2 de 2 como paga' })).toBeTruthy()
  })

  /**
   * Hotfix visual pós-Bloco 06 (2026-08-28): a ação já existia e funcionava
   * (RealizeEntryDialog/dispatch REALIZE intactos); a única mudança é
   * estrutural/CSS — a classe que alinha o botão ao fim da linha via
   * `margin-left: auto` (sem posicionamento absoluto). Não testa pixels.
   */
  it('hotfix visual: o botão "Marcar como pago" carrega a classe que o alinha ao fim da linha, como último elemento do item', async () => {
    const base = createTestFinanceState()
    const planId = 11
    const entries = [installmentEntry(planId, 1, 'planned')]
    const financeState: FinanceReadyState = { ...base, entries: [...base.entries, ...entries] }
    const planDtoValue = { ...planDto(planId, 'Placa de vídeo'), installmentCount: 1 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const path = new URL(String(url)).pathname
        if (path.endsWith('/installment-plans')) return jsonResponse({ data: [planDtoValue] })
        return jsonResponse({ data: { plan: planDtoValue, installments: [installmentDetailDto(planId, 1, 'planned', FIXTURE_CURRENT_PERIOD_ID, 7)] } })
      }),
    )
    renderWithProviders(<InstallmentPlansPage />, { initialEntries: ['/movimentacoes/parcelamentos'], financeState })

    await waitFor(() => expect(screen.getByText('Placa de vídeo')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Placa de vídeo' }))

    const payButton = await screen.findByRole('button', { name: /Marcar parcela 1 de 1 como paga/ })
    expect(payButton.classList.contains('fh-installment-detail__pay-button')).toBe(true)
    expect(payButton.parentElement?.lastElementChild).toBe(payButton)
  })
})
