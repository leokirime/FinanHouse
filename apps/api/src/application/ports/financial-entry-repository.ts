import type { FinancialEntry } from '@finanhouse/domain'

/**
 * Porta (interface) de acesso a movimentações financeiras. Implementações
 * reais (ex.: Drizzle/MySQL) e em memória (`infrastructure/repositories/memory`)
 * vivem fora da camada de domínio — nada aqui importa `mysql2`/`drizzle-orm`.
 */
export interface FinancialEntryRepository {
  findById(id: number): Promise<FinancialEntry | null>
  findByPeriod(periodId: number): Promise<FinancialEntry[]>
  findByHousehold(householdId: number): Promise<FinancialEntry[]>
  save(entry: FinancialEntry): Promise<FinancialEntry>
  nextId(): Promise<number>
}
