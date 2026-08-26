import { parseMoney, type FinancialEntry, type InstallmentPlan } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import {
  buildInstallmentPlanProgress,
  buildInstallmentPlanRow,
  buildInstallmentPreview,
  buildInstallmentRows,
  formatReferenceMonthLabel,
  INSTALLMENT_COUNT_MIN,
  monthInputValueToReferenceMonth,
  referenceMonthToMonthInputValue,
} from './installment-plan-view-model.ts'

const PLAN: InstallmentPlan = {
  id: 1,
  householdId: 1,
  description: 'Sofá',
  categoryId: 3,
  totalAmount: parseMoney('1000.00'),
  installmentCount: 3,
  firstReferenceMonth: '2026-08-01',
  dueDay: 10,
  createdByUserId: 100,
  createdAt: '2026-08-24T10:00:00.000Z',
}

function installment(overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: 1,
    householdId: 1,
    periodId: 1,
    categoryId: 3,
    responsibleMemberId: null,
    createdByUserId: 100,
    entryType: 'expense',
    status: 'planned',
    description: 'Sofá 1/3',
    expectedAmount: parseMoney('333.33'),
    actualAmount: null,
    dueDate: '2026-08-10',
    realizationDate: null,
    notes: null,
    installmentPlanId: 1,
    installmentNumber: 1,
    ...overrides,
  }
}

describe('INSTALLMENT_COUNT_MIN', () => {
  it('é 2 — nenhum máximo arbitrário reproduzido no frontend (correção da revisão pré-merge do Bloco 04)', () => {
    expect(INSTALLMENT_COUNT_MIN).toBe(2)
  })
})

describe('monthInputValueToReferenceMonth / referenceMonthToMonthInputValue', () => {
  it('converte "2026-08" (input month) para "2026-08-01" (competência do domínio)', () => {
    expect(monthInputValueToReferenceMonth('2026-08')).toBe('2026-08-01')
  })

  it('converte "2026-08-01" (competência do domínio) para "2026-08" (input month)', () => {
    expect(referenceMonthToMonthInputValue('2026-08-01')).toBe('2026-08')
  })
})

describe('formatReferenceMonthLabel', () => {
  it('formata "2026-08-01" como "Agosto de 2026"', () => {
    expect(formatReferenceMonthLabel('2026-08-01')).toBe('Agosto de 2026')
  })

  it('formata dezembro corretamente (virada de ano)', () => {
    expect(formatReferenceMonthLabel('2026-12-01')).toBe('Dezembro de 2026')
  })
})

describe('buildInstallmentPreview', () => {
  it('R$ 1.000,00 / 3 parcelas: usa splitMoney real (mesmo algoritmo do backend) — nunca 333,33 × 3 = 999,99 inventado', () => {
    const preview = buildInstallmentPreview(parseMoney('1000.00'), 3)
    expect(preview).not.toBeNull()
    expect(preview!.perInstallmentLabel).toBe('R$ 333,33')
    expect(preview!.totalLabel).toBe('R$ 1.000,00')
  })

  it('R$ 3.000,00 / 10 parcelas: R$ 300,00 cada', () => {
    const preview = buildInstallmentPreview(parseMoney('3000.00'), 10)
    expect(preview!.perInstallmentLabel).toBe('R$ 300,00')
  })

  it('retorna null para installmentCount < 2 (nunca mostra prévia inválida)', () => {
    expect(buildInstallmentPreview(parseMoney('100.00'), 1)).toBeNull()
    expect(buildInstallmentPreview(parseMoney('100.00'), 0)).toBeNull()
  })

  it('retorna null para installmentCount não inteiro', () => {
    expect(buildInstallmentPreview(parseMoney('100.00'), 2.5)).toBeNull()
  })

  it('não rejeita installmentCount = 61 — sem máximo arbitrário', () => {
    const preview = buildInstallmentPreview(parseMoney('6100.00'), 61)
    expect(preview).not.toBeNull()
    expect(preview!.perInstallmentLabel).toBe('R$ 100,00')
  })
})

describe('buildInstallmentPlanProgress', () => {
  it('deriva progresso das FinancialEntry relacionadas — nunca um campo persistido separado', () => {
    const entries = [installment({ id: 1, installmentNumber: 1, status: 'realized' }), installment({ id: 2, installmentNumber: 2, status: 'planned' }), installment({ id: 3, installmentNumber: 3, status: 'planned' })]
    const progress = buildInstallmentPlanProgress(PLAN, entries)
    expect(progress.realizedCount).toBe(1)
    expect(progress.totalCount).toBe(3)
    expect(progress.label).toBe('1 de 3 parcelas realizadas')
  })

  it('totalCount vem sempre de plan.installmentCount, nunca da contagem de entries carregadas — plano recém-criado ainda sem entries no estado global mostra "0 de N", nunca "0 de 0"', () => {
    const progress = buildInstallmentPlanProgress(PLAN, [])
    expect(progress.totalCount).toBe(3)
    expect(progress.realizedCount).toBe(0)
  })

  it('ignora entries de outros planos', () => {
    const entries = [installment({ id: 9, installmentPlanId: 999, status: 'realized' })]
    const progress = buildInstallmentPlanProgress(PLAN, entries)
    expect(progress.realizedCount).toBe(0)
  })
})

describe('buildInstallmentPlanRow', () => {
  it('monta a linha da lista com categoria real, total, aproximado e competência formatada', () => {
    const categories = [{ id: 3, householdId: 1, name: 'Móveis', entryType: 'expense' as const, status: 'active' as const }]
    const row = buildInstallmentPlanRow(PLAN, categories, [])
    expect(row.categoryName).toBe('Móveis')
    expect(row.totalAmountLabel).toBe('R$ 1.000,00')
    expect(row.installmentCount).toBe(3)
    expect(row.approxInstallmentLabel).toContain('R$ 333,33')
    expect(row.firstReferenceMonthLabel).toBe('Agosto de 2026')
    expect(row.dueDay).toBe(10)
  })

  it('categoria ausente vira "Sem categoria" — nunca undefined/erro', () => {
    const row = buildInstallmentPlanRow(PLAN, [], [])
    expect(row.categoryName).toBe('Sem categoria')
  })
})

describe('buildInstallmentRows', () => {
  it('ordena parcelas por número e usa o mesmo rótulo de status das movimentações', () => {
    const entries = [installment({ id: 3, installmentNumber: 3, status: 'planned' }), installment({ id: 1, installmentNumber: 1, status: 'realized' }), installment({ id: 2, installmentNumber: 2, status: 'planned' })]
    const rows = buildInstallmentRows(PLAN, entries)
    expect(rows.map((row) => row.installmentNumber)).toEqual([1, 2, 3])
    expect(rows[0]?.statusLabel).toBe('Realizado')
    expect(rows[0]?.totalCount).toBe(3)
  })
})
