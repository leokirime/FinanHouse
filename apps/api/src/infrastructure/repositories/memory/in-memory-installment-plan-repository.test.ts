import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryInstallmentPlanRepository } from './in-memory-installment-plan-repository.js'

function newPlanInput(overrides: Partial<Parameters<InMemoryInstallmentPlanRepository['create']>[0]> = {}) {
  return {
    householdId: 100,
    description: 'Sofá',
    categoryId: 200,
    totalAmount: 100000n,
    installmentCount: 10,
    firstReferenceMonth: '2026-08-01',
    dueDay: 5,
    createdByUserId: 300,
    createdAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  }
}

describe('InMemoryInstallmentPlanRepository', () => {
  let repository: InMemoryInstallmentPlanRepository

  beforeEach(() => {
    repository = new InMemoryInstallmentPlanRepository()
  })

  describe('create() — id sempre gerado internamente, nunca fornecido pelo chamador', () => {
    it('gera um id numérico e devolve o plano completo', async () => {
      const plan = await repository.create(newPlanInput())
      expect(plan.id).toBeTypeOf('number')
      expect(plan.description).toBe('Sofá')
    })

    it('duas chamadas sequenciais recebem ids diferentes', async () => {
      const first = await repository.create(newPlanInput({ description: 'Sofá' }))
      const second = await repository.create(newPlanInput({ description: 'Geladeira' }))
      expect(first.id).not.toBe(second.id)
    })
  })

  describe('findById', () => {
    it('retorna o plano criado', async () => {
      const created = await repository.create(newPlanInput())
      const found = await repository.findById(created.id)
      expect(found).toEqual(created)
    })

    it('devolve null para id inexistente', async () => {
      expect(await repository.findById(999)).toBeNull()
    })
  })

  describe('findByHousehold — isolamento entre households', () => {
    it('retorna apenas os planos do household pedido', async () => {
      await repository.create(newPlanInput({ householdId: 100, description: 'Sofá' }))
      await repository.create(newPlanInput({ householdId: 200, description: 'TV' }))

      const plans = await repository.findByHousehold(100)
      expect(plans).toHaveLength(1)
      expect(plans[0]?.description).toBe('Sofá')
    })

    it('devolve lista vazia quando o household não tem planos', async () => {
      await repository.create(newPlanInput({ householdId: 100 }))
      expect(await repository.findByHousehold(999)).toEqual([])
    })
  })

  describe('reset()', () => {
    it('limpa todos os planos e reinicia a contagem de ids', async () => {
      await repository.create(newPlanInput())
      repository.reset()
      expect(await repository.findByHousehold(100)).toEqual([])
      const plan = await repository.create(newPlanInput())
      expect(plan.id).toBe(1)
    })
  })
})
