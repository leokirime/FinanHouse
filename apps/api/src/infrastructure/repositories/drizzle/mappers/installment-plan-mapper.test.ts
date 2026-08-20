import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import type { InstallmentPlan as InstallmentPlanRow } from '../../../../db/types.js'
import { toDomainInstallmentPlan, toPersistenceNewInstallmentPlan } from './installment-plan-mapper.js'

function buildRow(overrides: Partial<InstallmentPlanRow> = {}): InstallmentPlanRow {
  return {
    id: 1,
    householdId: 10,
    description: 'Sofá',
    categoryId: 200,
    totalAmount: '1000.00',
    installmentCount: 10,
    firstReferenceMonth: '2026-08-01',
    dueDay: 5,
    createdByUserId: 300,
    createdAt: new Date('2026-08-01T12:00:00Z'),
    ...overrides,
  }
}

describe('toDomainInstallmentPlan', () => {
  it('mapeia todos os campos, convertendo dinheiro para centavos e createdAt para string ISO', () => {
    const plan = toDomainInstallmentPlan(buildRow())
    expect(plan).toEqual({
      id: 1,
      householdId: 10,
      description: 'Sofá',
      categoryId: 200,
      totalAmount: 100000n,
      installmentCount: 10,
      firstReferenceMonth: '2026-08-01',
      dueDay: 5,
      createdByUserId: 300,
      createdAt: '2026-08-01T12:00:00.000Z',
    })
  })

  it('mantém dueDay como número mandatório — nunca null', () => {
    const plan = toDomainInstallmentPlan(buildRow({ dueDay: 31 }))
    expect(plan.dueDay).toBe(31)
  })
})

describe('toPersistenceNewInstallmentPlan', () => {
  it('não inclui id — o AUTO_INCREMENT nativo é quem gera', () => {
    const values = toPersistenceNewInstallmentPlan({
      householdId: 10,
      description: 'Geladeira',
      categoryId: 200,
      totalAmount: parseMoney('2500.00'),
      installmentCount: 5,
      firstReferenceMonth: '2026-09-01',
      dueDay: 10,
      createdByUserId: 300,
      createdAt: '2026-08-20T00:00:00.000Z',
    })
    expect('id' in values).toBe(false)
    expect(values.totalAmount).toBe('2500.00')
    expect(values.createdAt).toEqual(new Date('2026-08-20T00:00:00.000Z'))
  })

  it('round trip domínio → persistência → domínio preserva os valores', () => {
    const original = toDomainInstallmentPlan(buildRow())
    const persisted = toPersistenceNewInstallmentPlan(original)
    const roundTripped = toDomainInstallmentPlan(buildRow({ ...persisted, id: original.id }))
    expect(roundTripped).toEqual(original)
  })
})
