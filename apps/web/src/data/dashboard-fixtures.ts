import type { Category, CategoryBudget, FinancialEntry, HouseholdMember, MonthlyPeriod } from '@finanhouse/domain'

/**
 * Dados inteiramente FICTÍCIOS usados como **estado inicial** do modo
 * demonstrativo (`state/`, Bloco 07) — a mesma fonte que alimentava o
 * dashboard estático do Bloco 06. Nenhum valor aqui representa dados reais
 * do proprietário do Finanhouse. Fonte única: `state/FinanceDemoProvider.tsx`
 * lê estes arrays uma única vez, na inicialização — nenhum componente de UI
 * deve importar este módulo diretamente.
 */
export const FIXTURE_HOUSEHOLD_ID = 1

export const FIXTURE_CURRENT_PERIOD_ID = 7
export const FIXTURE_PREVIOUS_PERIOD_ID = 6

export const MEMBER_RESPONSIBLE_A = 1
export const MEMBER_RESPONSIBLE_B = 2

/** `HouseholdMember` não tem campo de nome (é só uma referência a `userId`) — este rótulo é só para exibição no protótipo, não faz parte do domínio. */
export const fixtureMemberLabels: Record<number, string> = {
  [MEMBER_RESPONSIBLE_A]: 'Responsável A',
  [MEMBER_RESPONSIBLE_B]: 'Responsável B (inativo)',
}

export const fixtureHouseholdMembers: HouseholdMember[] = [
  { id: MEMBER_RESPONSIBLE_A, householdId: FIXTURE_HOUSEHOLD_ID, userId: 1, role: 'owner', status: 'active' },
  { id: MEMBER_RESPONSIBLE_B, householdId: FIXTURE_HOUSEHOLD_ID, userId: 2, role: 'member', status: 'inactive' },
]

export const CATEGORY_SALARY = 1
export const CATEGORY_FREELANCE = 2
export const CATEGORY_HOUSING = 3
export const CATEGORY_FOOD = 4
export const CATEGORY_TRANSPORT = 5
export const CATEGORY_LEISURE = 6
export const CATEGORY_HEALTH = 7

export const fixtureCategories: Category[] = [
  { id: CATEGORY_SALARY, householdId: FIXTURE_HOUSEHOLD_ID, name: 'Salário', entryType: 'income', status: 'active' },
  {
    id: CATEGORY_FREELANCE,
    householdId: FIXTURE_HOUSEHOLD_ID,
    name: 'Freelance',
    entryType: 'income',
    status: 'active',
  },
  { id: CATEGORY_HOUSING, householdId: FIXTURE_HOUSEHOLD_ID, name: 'Moradia', entryType: 'expense', status: 'active' },
  {
    id: CATEGORY_FOOD,
    householdId: FIXTURE_HOUSEHOLD_ID,
    name: 'Alimentação',
    entryType: 'expense',
    status: 'active',
  },
  {
    id: CATEGORY_TRANSPORT,
    householdId: FIXTURE_HOUSEHOLD_ID,
    name: 'Transporte',
    entryType: 'expense',
    status: 'active',
  },
  { id: CATEGORY_LEISURE, householdId: FIXTURE_HOUSEHOLD_ID, name: 'Lazer', entryType: 'expense', status: 'active' },
  { id: CATEGORY_HEALTH, householdId: FIXTURE_HOUSEHOLD_ID, name: 'Saúde', entryType: 'expense', status: 'active' },
]

export const fixtureMonthlyPeriods: MonthlyPeriod[] = [
  { id: 1, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-01-01', status: 'closed', closedAt: '2026-02-05', closedByUserId: 1 },
  { id: 2, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-02-01', status: 'closed', closedAt: '2026-03-05', closedByUserId: 1 },
  { id: 3, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-03-01', status: 'closed', closedAt: '2026-04-05', closedByUserId: 1 },
  { id: 4, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-04-01', status: 'closed', closedAt: '2026-05-05', closedByUserId: 1 },
  { id: 5, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-05-01', status: 'closed', closedAt: '2026-06-05', closedByUserId: 1 },
  { id: FIXTURE_PREVIOUS_PERIOD_ID, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-06-01', status: 'closed', closedAt: '2026-07-05', closedByUserId: 1 },
  // Aberta (não "review"): o Bloco 07 precisa criar/editar movimentações na
  // competência atual, e o domínio bloqueia isso fora de "open" por design
  // (ver assertPeriodAllowsEntryChanges em financial-entry-rules.ts).
  { id: FIXTURE_CURRENT_PERIOD_ID, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null },
]

let nextEntryId = 1
function entry(partial: Omit<FinancialEntry, 'id' | 'householdId' | 'createdByUserId' | 'responsibleMemberId' | 'notes'>): FinancialEntry {
  return {
    id: nextEntryId++,
    householdId: FIXTURE_HOUSEHOLD_ID,
    createdByUserId: 1,
    responsibleMemberId: null,
    notes: null,
    ...partial,
  }
}

const realizedIncome = (periodId: number, categoryId: number, amount: bigint, description: string, date: string) =>
  entry({
    periodId,
    categoryId,
    entryType: 'income',
    status: 'realized',
    description,
    expectedAmount: amount,
    actualAmount: amount,
    dueDate: date,
    realizationDate: date,
  })

const realizedExpense = (periodId: number, categoryId: number, amount: bigint, description: string, date: string) =>
  entry({
    periodId,
    categoryId,
    entryType: 'expense',
    status: 'realized',
    description,
    expectedAmount: amount,
    actualAmount: amount,
    dueDate: date,
    realizationDate: date,
  })

export const fixtureFinancialEntries: FinancialEntry[] = [
  // Janeiro (fechado)
  realizedIncome(1, CATEGORY_SALARY, 850000n, 'Salário — janeiro', '2026-01-05'),
  realizedIncome(1, CATEGORY_FREELANCE, 120000n, 'Projeto freelance', '2026-01-18'),
  realizedExpense(1, CATEGORY_HOUSING, 180000n, 'Aluguel', '2026-01-05'),
  realizedExpense(1, CATEGORY_FOOD, 92000n, 'Supermercado', '2026-01-20'),
  realizedExpense(1, CATEGORY_TRANSPORT, 42000n, 'Combustível e transporte', '2026-01-22'),
  realizedExpense(1, CATEGORY_LEISURE, 25000n, 'Lazer do mês', '2026-01-25'),

  // Fevereiro (fechado)
  realizedIncome(2, CATEGORY_SALARY, 850000n, 'Salário — fevereiro', '2026-02-05'),
  realizedExpense(2, CATEGORY_HOUSING, 180000n, 'Aluguel', '2026-02-05'),
  realizedExpense(2, CATEGORY_FOOD, 88000n, 'Supermercado', '2026-02-18'),
  realizedExpense(2, CATEGORY_TRANSPORT, 39000n, 'Combustível e transporte', '2026-02-20'),
  realizedExpense(2, CATEGORY_LEISURE, 18000n, 'Lazer do mês', '2026-02-22'),
  realizedExpense(2, CATEGORY_HEALTH, 35000n, 'Consulta médica', '2026-02-14'),

  // Março (fechado)
  realizedIncome(3, CATEGORY_SALARY, 862000n, 'Salário — março', '2026-03-05'),
  realizedIncome(3, CATEGORY_FREELANCE, 95000n, 'Projeto freelance', '2026-03-15'),
  realizedExpense(3, CATEGORY_HOUSING, 180000n, 'Aluguel', '2026-03-05'),
  realizedExpense(3, CATEGORY_FOOD, 95000n, 'Supermercado', '2026-03-19'),
  realizedExpense(3, CATEGORY_TRANSPORT, 45000n, 'Combustível e transporte', '2026-03-21'),
  realizedExpense(3, CATEGORY_LEISURE, 30000n, 'Lazer do mês', '2026-03-27'),

  // Abril (fechado)
  realizedIncome(4, CATEGORY_SALARY, 862000n, 'Salário — abril', '2026-04-05'),
  realizedExpense(4, CATEGORY_HOUSING, 180000n, 'Aluguel', '2026-04-05'),
  realizedExpense(4, CATEGORY_FOOD, 91000n, 'Supermercado', '2026-04-18'),
  realizedExpense(4, CATEGORY_TRANSPORT, 41000n, 'Combustível e transporte', '2026-04-20'),
  realizedExpense(4, CATEGORY_LEISURE, 22000n, 'Lazer do mês', '2026-04-24'),

  // Maio (fechado)
  realizedIncome(5, CATEGORY_SALARY, 862000n, 'Salário — maio', '2026-05-05'),
  realizedIncome(5, CATEGORY_FREELANCE, 150000n, 'Projeto freelance', '2026-05-12'),
  realizedExpense(5, CATEGORY_HOUSING, 180000n, 'Aluguel', '2026-05-05'),
  realizedExpense(5, CATEGORY_FOOD, 97000n, 'Supermercado', '2026-05-19'),
  realizedExpense(5, CATEGORY_TRANSPORT, 43000n, 'Combustível e transporte', '2026-05-21'),
  realizedExpense(5, CATEGORY_LEISURE, 15000n, 'Lazer do mês', '2026-05-23'),
  realizedExpense(5, CATEGORY_HEALTH, 42000n, 'Exame de rotina', '2026-05-09'),

  // Junho (fechado — mês anterior ao atual)
  realizedIncome(FIXTURE_PREVIOUS_PERIOD_ID, CATEGORY_SALARY, 875000n, 'Salário — junho', '2026-06-05'),
  realizedExpense(FIXTURE_PREVIOUS_PERIOD_ID, CATEGORY_HOUSING, 180000n, 'Aluguel', '2026-06-05'),
  realizedExpense(FIXTURE_PREVIOUS_PERIOD_ID, CATEGORY_FOOD, 93000n, 'Supermercado', '2026-06-18'),
  realizedExpense(FIXTURE_PREVIOUS_PERIOD_ID, CATEGORY_TRANSPORT, 40000n, 'Combustível e transporte', '2026-06-20'),
  realizedExpense(FIXTURE_PREVIOUS_PERIOD_ID, CATEGORY_LEISURE, 28000n, 'Lazer do mês', '2026-06-26'),

  // Julho (competência atual — em revisão): mistura de status para exercitar todos os casos
  realizedIncome(FIXTURE_CURRENT_PERIOD_ID, CATEGORY_SALARY, 875000n, 'Salário — julho', '2026-07-05'),
  entry({
    periodId: FIXTURE_CURRENT_PERIOD_ID,
    categoryId: CATEGORY_FREELANCE,
    entryType: 'income',
    status: 'pending',
    description: 'Projeto freelance (fatura enviada)',
    expectedAmount: 130000n,
    actualAmount: null,
    dueDate: '2026-07-28',
    realizationDate: null,
  }),
  realizedExpense(FIXTURE_CURRENT_PERIOD_ID, CATEGORY_HOUSING, 180000n, 'Aluguel', '2026-07-05'),
  realizedExpense(FIXTURE_CURRENT_PERIOD_ID, CATEGORY_FOOD, 61000n, 'Supermercado (parcial)', '2026-07-12'),
  entry({
    periodId: FIXTURE_CURRENT_PERIOD_ID,
    categoryId: CATEGORY_FOOD,
    entryType: 'expense',
    status: 'pending',
    description: 'Assinatura de kit de refeições',
    expectedAmount: 18000n,
    actualAmount: null,
    dueDate: '2026-07-26',
    realizationDate: null,
  }),
  entry({
    periodId: FIXTURE_CURRENT_PERIOD_ID,
    categoryId: CATEGORY_TRANSPORT,
    entryType: 'expense',
    status: 'pending',
    description: 'Parcela do seguro do carro',
    expectedAmount: 38000n,
    actualAmount: null,
    dueDate: '2026-07-27',
    realizationDate: null,
  }),
  entry({
    periodId: FIXTURE_CURRENT_PERIOD_ID,
    categoryId: CATEGORY_LEISURE,
    entryType: 'expense',
    status: 'planned',
    description: 'Viagem de fim de semana (planejada)',
    expectedAmount: 25000n,
    actualAmount: null,
    dueDate: '2026-07-31',
    realizationDate: null,
  }),
  entry({
    periodId: FIXTURE_CURRENT_PERIOD_ID,
    categoryId: CATEGORY_HEALTH,
    entryType: 'expense',
    status: 'cancelled',
    description: 'Consulta odontológica (cancelada)',
    expectedAmount: 45000n,
    actualAmount: null,
    dueDate: '2026-07-15',
    realizationDate: null,
  }),
]

export const BUDGET_HOUSING_CURRENT = 1
export const BUDGET_FOOD_CURRENT = 2
export const BUDGET_TRANSPORT_CURRENT = 3
export const BUDGET_HOUSING_PREVIOUS = 4

/**
 * Limites de orçamento sintéticos (Bloco 09) — cobrem de propósito os quatro
 * estados possíveis na competência atual (julho): Moradia em `attention`
 * (180000/200000 = 90%), Alimentação em `healthy` (79000/150000 ≈ 52,7%),
 * Transporte em `exceeded` (38000 > 30000). Lazer tem despesa (25000,
 * `planned`) mas nenhum limite definido — vira `unplanned`. Saúde não tem
 * limite nem despesa não cancelada — fica de fora da lista (ver
 * `buildCategoryBudgetSummaries`). Moradia de junho (competência fechada)
 * existe só para exercitar o bloqueio de edição/remoção em `closed`.
 */
export const fixtureCategoryBudgets: CategoryBudget[] = [
  { id: BUDGET_HOUSING_CURRENT, householdId: FIXTURE_HOUSEHOLD_ID, periodId: FIXTURE_CURRENT_PERIOD_ID, categoryId: CATEGORY_HOUSING, limitAmount: 200000n },
  { id: BUDGET_FOOD_CURRENT, householdId: FIXTURE_HOUSEHOLD_ID, periodId: FIXTURE_CURRENT_PERIOD_ID, categoryId: CATEGORY_FOOD, limitAmount: 150000n },
  { id: BUDGET_TRANSPORT_CURRENT, householdId: FIXTURE_HOUSEHOLD_ID, periodId: FIXTURE_CURRENT_PERIOD_ID, categoryId: CATEGORY_TRANSPORT, limitAmount: 30000n },
  { id: BUDGET_HOUSING_PREVIOUS, householdId: FIXTURE_HOUSEHOLD_ID, periodId: FIXTURE_PREVIOUS_PERIOD_ID, categoryId: CATEGORY_HOUSING, limitAmount: 180000n },
]
