import type { Category, FinancialEntry, MonthlyPeriod } from '@finanhouse/domain'

/**
 * Dados inteiramente FICTÍCIOS para o protótipo visual do dashboard (Bloco 06).
 * Nenhum valor aqui representa dados reais do proprietário do Finanhouse.
 * Fonte única: todos os componentes derivam destes arrays via
 * `view-models/dashboard-view-model.ts` — nenhum componente deve escrever
 * um valor monetário próprio.
 */
export const FIXTURE_HOUSEHOLD_ID = 1

export const FIXTURE_CURRENT_PERIOD_ID = 7
export const FIXTURE_PREVIOUS_PERIOD_ID = 6

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
  { id: FIXTURE_CURRENT_PERIOD_ID, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-07-01', status: 'review', closedAt: null, closedByUserId: null },
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
