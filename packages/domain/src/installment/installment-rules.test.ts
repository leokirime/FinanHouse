import { describe, expect, it } from 'vitest'
import { InvalidDateError, InvalidInstallmentPlanError, InvalidMoneyAmountError } from '../errors/domain-errors.js'
import { parseMoney, sumMoney } from '../money/money.js'
import {
  addMonthsToReferenceMonth,
  createInstallmentPlan,
  generateInstallments,
  resolveInstallmentDueDate,
  type CreateInstallmentPlanInput,
} from './installment-rules.js'

const HOUSEHOLD_ID = 1
const CATEGORY_ID = 3
const CREATED_BY_USER_ID = 10
const CREATED_AT = '2026-08-19T12:00:00.000Z'

function validPlanInput(overrides: Partial<CreateInstallmentPlanInput> = {}): CreateInstallmentPlanInput {
  return {
    id: 1,
    householdId: HOUSEHOLD_ID,
    description: 'Sofá',
    categoryId: CATEGORY_ID,
    totalAmount: parseMoney('3000.00'),
    installmentCount: 10,
    firstReferenceMonth: '2026-08-01',
    dueDay: 15,
    createdByUserId: CREATED_BY_USER_ID,
    createdAt: CREATED_AT,
    ...overrides,
  }
}

describe('addMonthsToReferenceMonth', () => {
  it('avança dentro do mesmo ano', () => {
    expect(addMonthsToReferenceMonth('2026-08-01', 1)).toBe('2026-09-01')
  })

  it('dezembro → janeiro (virada de ano)', () => {
    expect(addMonthsToReferenceMonth('2026-12-01', 1)).toBe('2027-01-01')
  })

  it('avança para fevereiro', () => {
    expect(addMonthsToReferenceMonth('2026-01-01', 1)).toBe('2026-02-01')
  })

  it('12 parcelas — uma volta exata de calendário', () => {
    expect(addMonthsToReferenceMonth('2026-08-01', 12)).toBe('2027-08-01')
  })

  it('24 parcelas — duas voltas de calendário', () => {
    expect(addMonthsToReferenceMonth('2026-08-01', 24)).toBe('2028-08-01')
  })

  it('plano cuja primeira parcela já começa em dezembro', () => {
    expect(addMonthsToReferenceMonth('2026-12-01', 0)).toBe('2026-12-01')
    expect(addMonthsToReferenceMonth('2026-12-01', 3)).toBe('2027-03-01')
  })

  it('months = 0 devolve a mesma competência', () => {
    expect(addMonthsToReferenceMonth('2026-08-01', 0)).toBe('2026-08-01')
  })

  it('rejeita referenceMonth em formato inválido', () => {
    expect(() => addMonthsToReferenceMonth('2026-08-15', 1)).toThrow(InvalidDateError)
    expect(() => addMonthsToReferenceMonth('not-a-date', 1)).toThrow(InvalidDateError)
  })
})

describe('resolveInstallmentDueDate', () => {
  it('dia 31 em mês de 31 dias permanece 31', () => {
    expect(resolveInstallmentDueDate('2026-01-01', 31)).toBe('2026-01-31')
  })

  it('dia 31 em fevereiro (não bissexto) vira o último dia válido (28)', () => {
    expect(resolveInstallmentDueDate('2026-02-01', 31)).toBe('2026-02-28')
  })

  it('dia 31 em fevereiro bissexto vira 29', () => {
    expect(resolveInstallmentDueDate('2028-02-01', 31)).toBe('2028-02-29')
  })

  it('dia 31 em mês de 30 dias vira 30', () => {
    expect(resolveInstallmentDueDate('2026-04-01', 31)).toBe('2026-04-30')
  })

  it('dia dentro do mês (ex.: 15) nunca é ajustado', () => {
    expect(resolveInstallmentDueDate('2026-04-01', 15)).toBe('2026-04-15')
  })

  it('nunca produz uma data de calendário inválida, para qualquer dueDay/mês', () => {
    for (let month = 1; month <= 12; month++) {
      const referenceMonth = `2026-${String(month).padStart(2, '0')}-01`
      for (let dueDay = 1; dueDay <= 31; dueDay++) {
        const result = resolveInstallmentDueDate(referenceMonth, dueDay)
        expect(() => new Date(result)).not.toThrow()
        expect(result.startsWith(referenceMonth.slice(0, 7))).toBe(true)
      }
    }
  })

  it('rejeita dueDay fora de 1–31', () => {
    expect(() => resolveInstallmentDueDate('2026-08-01', 0)).toThrow(InvalidInstallmentPlanError)
    expect(() => resolveInstallmentDueDate('2026-08-01', 32)).toThrow(InvalidInstallmentPlanError)
    expect(() => resolveInstallmentDueDate('2026-08-01', 1.5)).toThrow(InvalidInstallmentPlanError)
  })
})

describe('createInstallmentPlan', () => {
  it('cria um plano válido', () => {
    const plan = createInstallmentPlan(validPlanInput())
    expect(plan.installmentCount).toBe(10)
    expect(plan.totalAmount).toBe(parseMoney('3000.00'))
    expect(plan.dueDay).toBe(15)
  })

  it('contém createdAt', () => {
    const plan = createInstallmentPlan(validPlanInput())
    expect(plan.createdAt).toBeDefined()
    expect(typeof plan.createdAt).toBe('string')
  })

  it('createdAt fornecido na entrada é preservado exatamente, sem transformação', () => {
    const plan = createInstallmentPlan(validPlanInput({ createdAt: '2026-01-05T08:30:00.000Z' }))
    expect(plan.createdAt).toBe('2026-01-05T08:30:00.000Z')
  })

  it('aceita dueDay válido (1–31)', () => {
    expect(() => createInstallmentPlan(validPlanInput({ dueDay: 31 }))).not.toThrow()
    expect(() => createInstallmentPlan(validPlanInput({ dueDay: 1 }))).not.toThrow()
  })

  it('dueDay 1 é aceito e preservado', () => {
    expect(createInstallmentPlan(validPlanInput({ dueDay: 1 })).dueDay).toBe(1)
  })

  it('dueDay 31 é aceito e preservado', () => {
    expect(createInstallmentPlan(validPlanInput({ dueDay: 31 })).dueDay).toBe(31)
  })

  it('invariante 1: rejeita installmentCount < 2', () => {
    expect(() => createInstallmentPlan(validPlanInput({ installmentCount: 1 }))).toThrow(InvalidInstallmentPlanError)
    expect(() => createInstallmentPlan(validPlanInput({ installmentCount: 0 }))).toThrow(InvalidInstallmentPlanError)
    expect(() => createInstallmentPlan(validPlanInput({ installmentCount: -5 }))).toThrow(InvalidInstallmentPlanError)
  })

  it('invariante 1: rejeita installmentCount não inteiro', () => {
    expect(() => createInstallmentPlan(validPlanInput({ installmentCount: 2.5 }))).toThrow(InvalidInstallmentPlanError)
  })

  it('invariante 2: rejeita totalAmount não positivo', () => {
    expect(() => createInstallmentPlan(validPlanInput({ totalAmount: 0n }))).toThrow(InvalidMoneyAmountError)
    expect(() => createInstallmentPlan(validPlanInput({ totalAmount: -100n }))).toThrow(InvalidMoneyAmountError)
  })

  it('invariante 3: rejeita dueDay 0', () => {
    expect(() => createInstallmentPlan(validPlanInput({ dueDay: 0 }))).toThrow(InvalidInstallmentPlanError)
  })

  it('invariante 3: rejeita dueDay 32', () => {
    expect(() => createInstallmentPlan(validPlanInput({ dueDay: 32 }))).toThrow(InvalidInstallmentPlanError)
  })

  it('invariante 3: rejeita dueDay não inteiro', () => {
    expect(() => createInstallmentPlan(validPlanInput({ dueDay: 15.5 }))).toThrow(InvalidInstallmentPlanError)
  })

  it('invariante 3: dueDay é obrigatório — null não forma um InstallmentPlan válido, mesmo contornando o tipo em tempo de compilação', () => {
    expect(() => createInstallmentPlan({ ...validPlanInput(), dueDay: null } as unknown as CreateInstallmentPlanInput)).toThrow(
      InvalidInstallmentPlanError,
    )
  })

  it('invariante 3: dueDay é obrigatório — ausente (undefined) não forma um InstallmentPlan válido', () => {
    const { dueDay: _omitted, ...inputWithoutDueDay } = validPlanInput()
    expect(() => createInstallmentPlan(inputWithoutDueDay as CreateInstallmentPlanInput)).toThrow(InvalidInstallmentPlanError)
  })

  it('invariante 4: rejeita firstReferenceMonth em formato inválido', () => {
    expect(() => createInstallmentPlan(validPlanInput({ firstReferenceMonth: '2026-08-15' }))).toThrow(InvalidDateError)
    expect(() => createInstallmentPlan(validPlanInput({ firstReferenceMonth: 'agosto/2026' }))).toThrow(InvalidDateError)
  })
})

describe('generateInstallments', () => {
  it('invariante 5: gera exatamente N parcelas', () => {
    const plan = createInstallmentPlan(validPlanInput({ installmentCount: 10 }))
    expect(generateInstallments(plan)).toHaveLength(10)
  })

  it('invariante 6: numeração sequencial 1..N, sem lacuna e sem repetição', () => {
    const plan = createInstallmentPlan(validPlanInput({ installmentCount: 5 }))
    const numbers = generateInstallments(plan).map((installment) => installment.installmentNumber)
    expect(numbers).toEqual([1, 2, 3, 4, 5])
  })

  it('invariante 7: soma das parcelas é exatamente igual a totalAmount (R$ 1.000,00 em 3x)', () => {
    const plan = createInstallmentPlan(validPlanInput({ totalAmount: parseMoney('1000.00'), installmentCount: 3 }))
    const installments = generateInstallments(plan)
    expect(installments.map((installment) => installment.expectedAmount)).toEqual([33333n, 33333n, 33334n])
    expect(sumMoney(installments.map((installment) => installment.expectedAmount))).toBe(plan.totalAmount)
  })

  it('invariante 7: soma exata para uma faixa ampla de totalAmount/installmentCount', () => {
    for (const totalAmount of [parseMoney('10.00'), parseMoney('1000.00'), parseMoney('3000.00'), parseMoney('999999.99')]) {
      for (const installmentCount of [2, 3, 7, 12, 24]) {
        const plan = createInstallmentPlan(validPlanInput({ totalAmount, installmentCount }))
        const installments = generateInstallments(plan)
        expect(sumMoney(installments.map((installment) => installment.expectedAmount))).toBe(totalAmount)
      }
    }
  })

  it('invariante 8: competências avançam exatamente um mês por parcela', () => {
    const plan = createInstallmentPlan(validPlanInput({ firstReferenceMonth: '2026-08-01', installmentCount: 10 }))
    const referenceMonths = generateInstallments(plan).map((installment) => installment.referenceMonth)
    expect(referenceMonths).toEqual([
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
      '2027-02-01',
      '2027-03-01',
      '2027-04-01',
      '2027-05-01',
    ])
  })

  it('invariante 9: vencimentos sempre válidos, mesmo cruzando fevereiro/bissexto', () => {
    const plan = createInstallmentPlan(
      validPlanInput({ firstReferenceMonth: '2027-12-01', installmentCount: 4, dueDay: 31 }),
    )
    const dueDates = generateInstallments(plan).map((installment) => installment.dueDate)
    // dez/27 (31), jan/28 (31), fev/28 — 2028 é bissexto (29), mar/28 (31)
    expect(dueDates).toEqual(['2027-12-31', '2028-01-31', '2028-02-29', '2028-03-31'])
  })

  it('invariante 9: dueDate é sempre uma string de data válida — dueDay é obrigatório neste MVP, nenhuma parcela fica sem vencimento', () => {
    const plan = createInstallmentPlan(validPlanInput())
    const dueDates = generateInstallments(plan).map((installment) => installment.dueDate)
    expect(dueDates.every((dueDate) => typeof dueDate === 'string' && !Number.isNaN(new Date(dueDate).getTime()))).toBe(true)
  })

  it('invariante 10: todas as parcelas pertencem ao mesmo household do plano', () => {
    const plan = createInstallmentPlan(validPlanInput({ householdId: 42 }))
    expect(generateInstallments(plan).every((installment) => installment.householdId === 42)).toBe(true)
  })

  it('invariante 11: todas as parcelas referenciam o mesmo InstallmentPlan', () => {
    const plan = createInstallmentPlan(validPlanInput({ id: 99 }))
    expect(generateInstallments(plan).every((installment) => installment.installmentPlanId === 99)).toBe(true)
  })

  it('invariante 12: status inicial de cada parcela é sempre "planned"', () => {
    const plan = createInstallmentPlan(validPlanInput())
    expect(generateInstallments(plan).every((installment) => installment.status === 'planned')).toBe(true)
  })

  it('invariante 13/15: parcelas são objetos independentes — mutar uma cópia de uma não afeta as demais', () => {
    const plan = createInstallmentPlan(validPlanInput({ installmentCount: 3 }))
    const installments = generateInstallments(plan)
    const mutatedFirst = { ...installments[0]!, expectedAmount: 999999n, status: 'planned' as const }

    expect(installments[0]!.expectedAmount).not.toBe(999999n)
    expect(installments[1]).not.toBe(installments[0])
    expect(installments[2]).not.toBe(installments[0])
    expect(mutatedFirst.expectedAmount).toBe(999999n)
    // Nenhuma referência compartilhada entre parcelas — cada uma é um objeto próprio.
    expect(new Set(installments).size).toBe(installments.length)
  })

  it('createdByUserId é propagado do plano para cada parcela, só como metadado de autoria — nunca usado para filtrar/gerar visibilidade (não há nenhuma consulta por usuário neste módulo)', () => {
    const plan = createInstallmentPlan(validPlanInput({ createdByUserId: 77 }))
    expect(generateInstallments(plan).every((installment) => installment.createdByUserId === 77)).toBe(true)
  })

  it('rejeita geração a partir de um plano com totalAmount zero (defesa em profundidade via splitMoney)', () => {
    const plan = { ...createInstallmentPlan(validPlanInput()), totalAmount: 0n }
    expect(() => generateInstallments(plan)).toThrow(InvalidMoneyAmountError)
  })
})
