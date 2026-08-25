import { describe, expect, it } from 'vitest'
import type { Category } from '../category/category.js'
import {
  CategoryEntryTypeMismatchError,
  ClosedPeriodError,
  HouseholdMismatchError,
  InactiveCategoryError,
  InactiveHouseholdMemberError,
  InvalidDateError,
  InvalidMoneyAmountError,
  InvalidStatusTransitionError,
  MissingRealizationDataError,
  PeriodInReviewError,
  UnexpectedRealizationDataError,
} from '../errors/domain-errors.js'
import type { HouseholdMember } from '../household-member/household-member.js'
import { parseMoney } from '../money/money.js'
import type { MonthlyPeriod } from '../monthly-period/monthly-period.js'
import type { FinancialEntry } from './financial-entry.js'
import {
  assertFinancialEntryDeletable,
  assertFinancialEntryRealizationInvariants,
  assertValidDate,
  cancelFinancialEntry,
  type CreateFinancialEntryInput,
  correctFinancialEntryToPlanned,
  createFinancialEntry,
  markFinancialEntryAsPending,
  reactivateFinancialEntry,
  realizeFinancialEntry,
  revertFinancialEntryRealization,
  updateFinancialEntry,
} from './financial-entry-rules.js'

const HOUSEHOLD_ID = 1

function makeOpenPeriod(overrides: Partial<MonthlyPeriod> = {}): MonthlyPeriod {
  return {
    id: 10,
    householdId: HOUSEHOLD_ID,
    referenceMonth: '2026-07-01',
    status: 'open',
    closedAt: null,
    closedByUserId: null,
    ...overrides,
  }
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 20,
    householdId: HOUSEHOLD_ID,
    name: 'Mercado',
    entryType: 'expense',
    status: 'active',
    ...overrides,
  }
}

function makeMember(overrides: Partial<HouseholdMember> = {}): HouseholdMember {
  return {
    id: 30,
    householdId: HOUSEHOLD_ID,
    userId: 40,
    role: 'member',
    status: 'active',
    ...overrides,
  }
}

function baseInput(): CreateFinancialEntryInput {
  return {
    id: 1,
    householdId: HOUSEHOLD_ID,
    periodId: 10,
    categoryId: 20,
    responsibleMemberId: null,
    createdByUserId: 40,
    entryType: 'expense',
    description: 'Compras do mês',
    expectedAmount: parseMoney('250.00'),
    dueDate: null,
    notes: null,
  }
}

function createValidEntry(overrides: Partial<ReturnType<typeof baseInput>> = {}, period = makeOpenPeriod()): FinancialEntry {
  return createFinancialEntry({ ...baseInput(), ...overrides }, { period, category: makeCategory() })
}

describe('createFinancialEntry', () => {
  it('cria uma movimentação planned válida', () => {
    const entry = createValidEntry()
    expect(entry.status).toBe('planned')
    expect(entry.actualAmount).toBeNull()
    expect(entry.realizationDate).toBeNull()
  })

  it('lançamento avulso: installmentPlanId/installmentNumber nulos por padrão, sem precisar informá-los (Sessão 12, Bloco 04)', () => {
    const entry = createValidEntry()
    expect(entry.installmentPlanId).toBeNull()
    expect(entry.installmentNumber).toBeNull()
  })

  it('parcela: installmentPlanId/installmentNumber preservados quando informados', () => {
    const entry = createValidEntry({ installmentPlanId: 7, installmentNumber: 3 })
    expect(entry.installmentPlanId).toBe(7)
    expect(entry.installmentNumber).toBe(3)
  })

  it('rejeita expected_amount não positivo', () => {
    expect(() => createValidEntry({ expectedAmount: 0n })).toThrow(InvalidMoneyAmountError)
    expect(() => createValidEntry({ expectedAmount: -100n })).toThrow(InvalidMoneyAmountError)
  })

  it('rejeita due_date inválida', () => {
    expect(() => createValidEntry({ dueDate: '2026-02-30' })).toThrow(InvalidDateError)
    expect(() => createValidEntry({ dueDate: 'not-a-date' })).toThrow(InvalidDateError)
  })

  it('rejeita categoria com entry_type incompatível', () => {
    const period = makeOpenPeriod()
    expect(() =>
      createFinancialEntry(
        { ...baseInput(), entryType: 'income' },
        { period, category: makeCategory({ entryType: 'expense' }) },
      ),
    ).toThrow(CategoryEntryTypeMismatchError)
  })

  it('rejeita categoria inativa', () => {
    const period = makeOpenPeriod()
    expect(() =>
      createFinancialEntry({ ...baseInput() }, { period, category: makeCategory({ status: 'inactive' }) }),
    ).toThrow(InactiveCategoryError)
  })

  it('rejeita membro responsável inativo', () => {
    const period = makeOpenPeriod()
    expect(() =>
      createFinancialEntry(
        { ...baseInput(), responsibleMemberId: 30 },
        { period, category: makeCategory(), member: makeMember({ status: 'inactive' }) },
      ),
    ).toThrow(InactiveHouseholdMemberError)
  })

  it('rejeita período de outro household', () => {
    const period = makeOpenPeriod({ householdId: 999 })
    expect(() => createFinancialEntry(baseInput(), { period, category: makeCategory() })).toThrow(HouseholdMismatchError)
  })

  it('rejeita categoria de outro household', () => {
    const period = makeOpenPeriod()
    expect(() =>
      createFinancialEntry(baseInput(), { period, category: makeCategory({ householdId: 999 }) }),
    ).toThrow(HouseholdMismatchError)
  })

  it('rejeita membro de outro household', () => {
    const period = makeOpenPeriod()
    expect(() =>
      createFinancialEntry(
        { ...baseInput(), responsibleMemberId: 30 },
        { period, category: makeCategory(), member: makeMember({ householdId: 999 }) },
      ),
    ).toThrow(HouseholdMismatchError)
  })

  it('rejeita criação em competência fechada', () => {
    const period = makeOpenPeriod({ status: 'closed' })
    expect(() => createFinancialEntry(baseInput(), { period, category: makeCategory() })).toThrow(ClosedPeriodError)
  })

  it('rejeita criação comum em competência em revisão', () => {
    const period = makeOpenPeriod({ status: 'review' })
    expect(() => createFinancialEntry(baseInput(), { period, category: makeCategory() })).toThrow(PeriodInReviewError)
  })
})

describe('updateFinancialEntry', () => {
  it('atualiza campos permitidos de uma movimentação planned', () => {
    const entry = createValidEntry()
    const period = makeOpenPeriod()
    const updated = updateFinancialEntry(entry, { description: 'Nova descrição' }, { period, category: makeCategory() })
    expect(updated.description).toBe('Nova descrição')
  })

  it('rejeita edição direta de movimentação realized', () => {
    const period = makeOpenPeriod()
    const entry = realizeFinancialEntry(createValidEntry(), period, {
      actualAmount: parseMoney('250.00'),
      realizationDate: '2026-07-10',
    })
    expect(() => updateFinancialEntry(entry, { description: 'x' }, { period, category: makeCategory() })).toThrow(
      InvalidStatusTransitionError,
    )
  })

  it('rejeita edição de movimentação cancelled', () => {
    const period = makeOpenPeriod()
    const entry = cancelFinancialEntry(createValidEntry(), period)
    expect(() => updateFinancialEntry(entry, { description: 'x' }, { period, category: makeCategory() })).toThrow(
      InvalidStatusTransitionError,
    )
  })

  it('rejeita alteração em competência fechada', () => {
    const entry = createValidEntry()
    const closedPeriod = makeOpenPeriod({ status: 'closed' })
    expect(() => updateFinancialEntry(entry, { description: 'x' }, { period: closedPeriod, category: makeCategory() })).toThrow(
      ClosedPeriodError,
    )
  })
})

describe('transições permitidas', () => {
  it('planned → pending', () => {
    const period = makeOpenPeriod()
    const entry = markFinancialEntryAsPending(createValidEntry({}, period), period)
    expect(entry.status).toBe('pending')
  })

  it('planned → realized', () => {
    const period = makeOpenPeriod()
    const entry = realizeFinancialEntry(createValidEntry({}, period), period, {
      actualAmount: parseMoney('250.00'),
      realizationDate: '2026-07-15',
    })
    expect(entry.status).toBe('realized')
    expect(entry.actualAmount).toBe(parseMoney('250.00'))
    expect(entry.realizationDate).toBe('2026-07-15')
  })

  it('planned → cancelled', () => {
    const period = makeOpenPeriod()
    const entry = cancelFinancialEntry(createValidEntry({}, period), period)
    expect(entry.status).toBe('cancelled')
  })

  it('pending → realized', () => {
    const period = makeOpenPeriod()
    const pending = markFinancialEntryAsPending(createValidEntry({}, period), period)
    const entry = realizeFinancialEntry(pending, period, {
      actualAmount: parseMoney('250.00'),
      realizationDate: '2026-07-15',
    })
    expect(entry.status).toBe('realized')
  })

  it('pending → cancelled', () => {
    const period = makeOpenPeriod()
    const pending = markFinancialEntryAsPending(createValidEntry({}, period), period)
    expect(cancelFinancialEntry(pending, period).status).toBe('cancelled')
  })

  it('pending → planned (correção explícita)', () => {
    const period = makeOpenPeriod()
    const pending = markFinancialEntryAsPending(createValidEntry({}, period), period)
    expect(correctFinancialEntryToPlanned(pending, period).status).toBe('planned')
  })

  it('realized → pending (estorno explícito)', () => {
    const period = makeOpenPeriod()
    const realized = realizeFinancialEntry(createValidEntry({}, period), period, {
      actualAmount: parseMoney('250.00'),
      realizationDate: '2026-07-15',
    })
    const reverted = revertFinancialEntryRealization(realized, period)
    expect(reverted.status).toBe('pending')
    expect(reverted.actualAmount).toBeNull()
    expect(reverted.realizationDate).toBeNull()
  })

  it('cancelled → planned (reativação explícita)', () => {
    const period = makeOpenPeriod()
    const cancelled = cancelFinancialEntry(createValidEntry({}, period), period)
    expect(reactivateFinancialEntry(cancelled, period).status).toBe('planned')
  })
})

describe('transições proibidas', () => {
  it('realized não pode ser cancelada diretamente', () => {
    const period = makeOpenPeriod()
    const realized = realizeFinancialEntry(createValidEntry({}, period), period, {
      actualAmount: parseMoney('250.00'),
      realizationDate: '2026-07-15',
    })
    expect(() => cancelFinancialEntry(realized, period)).toThrow(InvalidStatusTransitionError)
  })

  it('cancelled não pode ser marcada como pending', () => {
    const period = makeOpenPeriod()
    const cancelled = cancelFinancialEntry(createValidEntry({}, period), period)
    expect(() => markFinancialEntryAsPending(cancelled, period)).toThrow(InvalidStatusTransitionError)
  })

  it('cancelled não pode ser realizada diretamente', () => {
    const period = makeOpenPeriod()
    const cancelled = cancelFinancialEntry(createValidEntry({}, period), period)
    expect(() =>
      realizeFinancialEntry(cancelled, period, { actualAmount: parseMoney('1.00'), realizationDate: '2026-07-15' }),
    ).toThrow(InvalidStatusTransitionError)
  })

  it('planned não pode ser corrigida para planned (correctToPlanned exige pending)', () => {
    const period = makeOpenPeriod()
    const entry = createValidEntry({}, period)
    expect(() => correctFinancialEntryToPlanned(entry, period)).toThrow(InvalidStatusTransitionError)
  })

  it('planned não pode ser estornada (revert exige realized)', () => {
    const period = makeOpenPeriod()
    const entry = createValidEntry({}, period)
    expect(() => revertFinancialEntryRealization(entry, period)).toThrow(InvalidStatusTransitionError)
  })

  it('planned não pode ser reativada (reactivate exige cancelled)', () => {
    const period = makeOpenPeriod()
    const entry = createValidEntry({}, period)
    expect(() => reactivateFinancialEntry(entry, period)).toThrow(InvalidStatusTransitionError)
  })
})

/**
 * `assertFinancialEntryDeletable` (Bloco 20, ajustada no mesmo bloco após
 * revisão): a competência precisa estar aberta, mesma regra de
 * `cancelFinancialEntry`/`assertPeriodAllowsEntryChanges`. Diferente do
 * cancelamento, `realized` TAMBÉM é elegível — só `cancelled` permanece
 * bloqueada (reativação é o único caminho de volta para um registro já
 * cancelado).
 */
describe('assertFinancialEntryDeletable', () => {
  it('permite excluir uma movimentação "planned"', () => {
    const period = makeOpenPeriod()
    const entry = createValidEntry({}, period)
    expect(() => assertFinancialEntryDeletable(entry, period)).not.toThrow()
  })

  it('permite excluir uma movimentação "pending"', () => {
    const period = makeOpenPeriod()
    const pending = markFinancialEntryAsPending(createValidEntry({}, period), period)
    expect(() => assertFinancialEntryDeletable(pending, period)).not.toThrow()
  })

  it('permite excluir uma movimentação "realized" em competência aberta (Bloco 20 — ajuste pós-revisão)', () => {
    const period = makeOpenPeriod()
    const realized = realizeFinancialEntry(createValidEntry({}, period), period, {
      actualAmount: parseMoney('250.00'),
      realizationDate: '2026-07-15',
    })
    expect(() => assertFinancialEntryDeletable(realized, period)).not.toThrow()
  })

  it('rejeita excluir uma movimentação "cancelled" — reativação continua sendo o único caminho de volta', () => {
    const period = makeOpenPeriod()
    const cancelled = cancelFinancialEntry(createValidEntry({}, period), period)
    expect(() => assertFinancialEntryDeletable(cancelled, period)).toThrow(InvalidStatusTransitionError)
  })

  it('bloqueia exclusão em competência fechada, mesmo para "realized"', () => {
    const closedPeriod = makeOpenPeriod({ status: 'closed' })
    const realized: FinancialEntry = { ...createValidEntry(), status: 'realized', actualAmount: parseMoney('250.00'), realizationDate: '2026-07-15' }
    expect(() => assertFinancialEntryDeletable(realized, closedPeriod)).toThrow(ClosedPeriodError)
  })

  it('bloqueia exclusão em competência fechada', () => {
    const closedPeriod = makeOpenPeriod({ status: 'closed' })
    const entry = createValidEntry()
    expect(() => assertFinancialEntryDeletable(entry, closedPeriod)).toThrow(ClosedPeriodError)
  })

  it('bloqueia exclusão em competência em revisão (mesma regra de cancelFinancialEntry, sem ajuste explícito)', () => {
    const reviewPeriod = makeOpenPeriod({ status: 'review' })
    const entry = createValidEntry({}, makeOpenPeriod())
    expect(() => assertFinancialEntryDeletable(entry, reviewPeriod)).toThrow(PeriodInReviewError)
  })

  it('permite exclusão em competência aberta', () => {
    const period = makeOpenPeriod()
    const entry = createValidEntry({}, period)
    expect(() => assertFinancialEntryDeletable(entry, period)).not.toThrow()
  })
})

describe('realização', () => {
  it('rejeita realização sem actual_amount', () => {
    const period = makeOpenPeriod()
    expect(() =>
      realizeFinancialEntry(createValidEntry({}, period), period, { realizationDate: '2026-07-15' }),
    ).toThrow(MissingRealizationDataError)
  })

  it('rejeita realização sem realization_date', () => {
    const period = makeOpenPeriod()
    expect(() =>
      realizeFinancialEntry(createValidEntry({}, period), period, { actualAmount: parseMoney('250.00') }),
    ).toThrow(MissingRealizationDataError)
  })

  it('rejeita actual_amount não positivo', () => {
    const period = makeOpenPeriod()
    expect(() =>
      realizeFinancialEntry(createValidEntry({}, period), period, { actualAmount: 0n, realizationDate: '2026-07-15' }),
    ).toThrow(InvalidMoneyAmountError)
  })
})

describe('competência fechada e em revisão', () => {
  it('bloqueia todas as operações em competência fechada', () => {
    const closedPeriod = makeOpenPeriod({ status: 'closed' })
    const entry = createValidEntry()
    expect(() => markFinancialEntryAsPending(entry, closedPeriod)).toThrow(ClosedPeriodError)
    expect(() => cancelFinancialEntry(entry, closedPeriod)).toThrow(ClosedPeriodError)
    expect(() =>
      realizeFinancialEntry(entry, closedPeriod, { actualAmount: parseMoney('1.00'), realizationDate: '2026-07-15' }),
    ).toThrow(ClosedPeriodError)
  })

  it('bloqueia criação/edição comum em competência em revisão, mas permite ajustes explícitos', () => {
    const reviewPeriod = makeOpenPeriod({ status: 'review' })
    const openPeriod = makeOpenPeriod()
    const entry = createValidEntry({}, openPeriod)
    const pending = markFinancialEntryAsPending(entry, openPeriod)
    const realized = realizeFinancialEntry(pending, openPeriod, {
      actualAmount: parseMoney('250.00'),
      realizationDate: '2026-07-15',
    })

    expect(() => createFinancialEntry(baseInput(), { period: reviewPeriod, category: makeCategory() })).toThrow(
      PeriodInReviewError,
    )
    // Ajuste explícito de revisão é permitido em período "review":
    expect(revertFinancialEntryRealization(realized, reviewPeriod).status).toBe('pending')
  })
})

describe('assertValidDate', () => {
  it('aceita datas de calendário reais', () => {
    expect(() => assertValidDate('2026-07-25', 'due_date')).not.toThrow()
    expect(() => assertValidDate('2024-02-29', 'due_date')).not.toThrow() // ano bissexto
  })

  it('rejeita datas de calendário inexistentes', () => {
    expect(() => assertValidDate('2026-02-30', 'due_date')).toThrow(InvalidDateError)
    expect(() => assertValidDate('2025-02-29', 'due_date')).toThrow(InvalidDateError) // não bissexto
  })

  it('rejeita formato inválido', () => {
    expect(() => assertValidDate('25/07/2026', 'due_date')).toThrow(InvalidDateError)
    expect(() => assertValidDate('2026-7-25', 'due_date')).toThrow(InvalidDateError)
  })
})

describe('assertFinancialEntryRealizationInvariants', () => {
  it('rejeita entry realized sem actual_amount', () => {
    const entry = { ...createValidEntry(), status: 'realized' as const, realizationDate: '2026-07-15' }
    expect(() => assertFinancialEntryRealizationInvariants(entry)).toThrow(MissingRealizationDataError)
  })

  it('rejeita entry não realizada com actual_amount presente', () => {
    const entry = { ...createValidEntry(), actualAmount: parseMoney('1.00') }
    expect(() => assertFinancialEntryRealizationInvariants(entry)).toThrow(UnexpectedRealizationDataError)
  })

  it('rejeita entry cancelled com realization_date presente', () => {
    const period = makeOpenPeriod()
    const cancelled = cancelFinancialEntry(createValidEntry({}, period), period)
    const invalid = { ...cancelled, realizationDate: '2026-07-15' }
    expect(() => assertFinancialEntryRealizationInvariants(invalid)).toThrow(UnexpectedRealizationDataError)
  })
})
