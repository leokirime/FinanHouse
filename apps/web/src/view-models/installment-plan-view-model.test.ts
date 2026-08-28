import { parseMoney, type FinancialEntry, type InstallmentPlan } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import {
  buildInstallmentPlanProgress,
  buildInstallmentPlanRow,
  buildInstallmentPreview,
  buildInstallmentRows,
  filterInstallmentPlansByStatus,
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

/**
 * Ajuste pós-validação visual do Bloco 06 — "concluído" é estritamente
 * `realizedCount === installmentCount`, nunca um status persistido, nunca
 * inferido por `totalAmount`, descrição ou data. Uma parcela ausente (ex.:
 * excluída) nunca é tratada como equivalente a realizada — o plano só é
 * concluído quando TODAS as parcelas originalmente previstas foram de fato
 * realizadas.
 */
describe('buildInstallmentPlanProgress — isCompleted', () => {
  const PLAN_10: InstallmentPlan = { ...PLAN, id: 2, installmentCount: 10 }

  function realizedInstallments(count: number, planId: number, total: number): FinancialEntry[] {
    return Array.from({ length: count }, (_, index) =>
      installment({ id: index + 1, installmentPlanId: planId, installmentNumber: index + 1, status: 'realized' }),
    ).concat(
      Array.from({ length: Math.max(0, total - count) }, (_, index) =>
        installment({ id: count + index + 1, installmentPlanId: planId, installmentNumber: count + index + 1, status: 'planned' }),
      ),
    )
  }

  it('0 de 10 parcelas realizadas — isCompleted é false', () => {
    const progress = buildInstallmentPlanProgress(PLAN_10, realizedInstallments(0, PLAN_10.id, 10))
    expect(progress.isCompleted).toBe(false)
  })

  it('9 de 10 parcelas realizadas — isCompleted é false', () => {
    const progress = buildInstallmentPlanProgress(PLAN_10, realizedInstallments(9, PLAN_10.id, 10))
    expect(progress.isCompleted).toBe(false)
  })

  it('10 de 10 parcelas realizadas — isCompleted é true', () => {
    const progress = buildInstallmentPlanProgress(PLAN_10, realizedInstallments(10, PLAN_10.id, 10))
    expect(progress.isCompleted).toBe(true)
  })

  it('installmentCount = 3 com só 2 entries realizadas — isCompleted é false', () => {
    const entries = [
      installment({ id: 1, installmentNumber: 1, status: 'realized' }),
      installment({ id: 2, installmentNumber: 2, status: 'realized' }),
      installment({ id: 3, installmentNumber: 3, status: 'planned' }),
    ]
    expect(buildInstallmentPlanProgress(PLAN, entries).isCompleted).toBe(false)
  })

  it('entry de outro installmentPlanId é ignorada — não conta para a conclusão deste plano', () => {
    const entries = [
      installment({ id: 1, installmentNumber: 1, status: 'realized' }),
      installment({ id: 2, installmentNumber: 2, status: 'realized' }),
      installment({ id: 9, installmentPlanId: 999, installmentNumber: 1, status: 'realized' }),
    ]
    expect(buildInstallmentPlanProgress(PLAN, entries).isCompleted).toBe(false)
  })

  it('parcela ausente (ex.: excluída) nunca é tratada como realizada — plano com apenas 2 das 3 entries carregadas nunca aparece concluído', () => {
    const entries = [
      installment({ id: 1, installmentNumber: 1, status: 'realized' }),
      installment({ id: 2, installmentNumber: 2, status: 'realized' }),
    ]
    expect(buildInstallmentPlanProgress(PLAN, entries).isCompleted).toBe(false)
  })
})

describe('filterInstallmentPlansByStatus', () => {
  const PLAN_A: InstallmentPlan = { ...PLAN, id: 1, installmentCount: 10 }
  const PLAN_B: InstallmentPlan = { ...PLAN, id: 2, installmentCount: 10 }

  function entriesFor(planId: number, realizedCount: number, total: number): FinancialEntry[] {
    return Array.from({ length: total }, (_, index) =>
      installment({
        id: planId * 100 + index + 1,
        installmentPlanId: planId,
        installmentNumber: index + 1,
        status: index < realizedCount ? 'realized' : 'planned',
      }),
    )
  }

  it('"active" mostra só planos ainda não concluídos (3/10), nunca os concluídos (10/10)', () => {
    const entries = [...entriesFor(PLAN_A.id, 3, 10), ...entriesFor(PLAN_B.id, 10, 10)]
    const result = filterInstallmentPlansByStatus([PLAN_A, PLAN_B], entries, 'active')
    expect(result.map((plan) => plan.id)).toEqual([PLAN_A.id])
  })

  it('"completed" mostra só planos concluídos (10/10), nunca os em andamento (3/10)', () => {
    const entries = [...entriesFor(PLAN_A.id, 3, 10), ...entriesFor(PLAN_B.id, 10, 10)]
    const result = filterInstallmentPlansByStatus([PLAN_A, PLAN_B], entries, 'completed')
    expect(result.map((plan) => plan.id)).toEqual([PLAN_B.id])
  })

  it('"all" mostra ambos, em andamento e concluídos', () => {
    const entries = [...entriesFor(PLAN_A.id, 3, 10), ...entriesFor(PLAN_B.id, 10, 10)]
    const result = filterInstallmentPlansByStatus([PLAN_A, PLAN_B], entries, 'all')
    expect(result.map((plan) => plan.id).sort()).toEqual([PLAN_A.id, PLAN_B.id].sort())
  })

  it('transição: plano com 9/10 aparece em "active" e some de "active" ao passar para 10/10 (sem persistir status)', () => {
    const before = entriesFor(PLAN_A.id, 9, 10)
    expect(filterInstallmentPlansByStatus([PLAN_A], before, 'active').map((plan) => plan.id)).toEqual([PLAN_A.id])
    expect(filterInstallmentPlansByStatus([PLAN_A], before, 'completed')).toEqual([])

    const after = entriesFor(PLAN_A.id, 10, 10)
    expect(filterInstallmentPlansByStatus([PLAN_A], after, 'active')).toEqual([])
    expect(filterInstallmentPlansByStatus([PLAN_A], after, 'completed').map((plan) => plan.id)).toEqual([PLAN_A.id])
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

  /**
   * Ajuste pós-validação visual: integração Parcelamentos ↔ Lançamentos —
   * `canRealize` é EXATAMENTE a mesma regra de `financial-entries-view-model.ts`
   * (`status === 'planned' || status === 'pending'`), nunca uma transição
   * paralela reinventada para a tela de Parcelamentos.
   */
  it('canRealize é true para "planned"/"pending" e false para "realized"/"cancelled"', () => {
    const entries = [
      installment({ id: 1, installmentNumber: 1, status: 'planned' }),
      installment({ id: 2, installmentNumber: 2, status: 'pending' }),
      installment({ id: 3, installmentNumber: 3, status: 'realized' }),
    ]
    const rows = buildInstallmentRows(PLAN, entries)
    expect(rows.find((row) => row.installmentNumber === 1)?.canRealize).toBe(true)
    expect(rows.find((row) => row.installmentNumber === 2)?.canRealize).toBe(true)
    expect(rows.find((row) => row.installmentNumber === 3)?.canRealize).toBe(false)
  })
})
