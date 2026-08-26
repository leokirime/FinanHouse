import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestFinanceState } from '../state/test-support/finance-test-fixtures.ts'
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
