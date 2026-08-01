import {
  InMemoryCategoryRepository,
  InMemoryFinancialEntryRepository,
  InMemoryHouseholdMemberRepository,
  InMemoryMonthlyPeriodRepository,
} from '../../infrastructure/repositories/memory/index.js'
import { createHttpApp, type HttpAppRepositories } from '../app.js'
import type { ReadinessCheck } from '../routes/ready.js'

/**
 * Tipo concreto (não só as portas) para que os testes possam usar `seed()`/
 * `reset()` — extras das implementações em memória, fora do contrato das
 * portas, mas estruturalmente compatíveis com `HttpAppRepositories`.
 */
export interface TestRepositories {
  entries: InMemoryFinancialEntryRepository
  periods: InMemoryMonthlyPeriodRepository
  categories: InMemoryCategoryRepository
  members: InMemoryHouseholdMemberRepository
}

/** Repositórios em memória — nunca abrem conexão real; usados só em testes. */
export function buildTestRepositories(): TestRepositories {
  return {
    entries: new InMemoryFinancialEntryRepository(),
    periods: new InMemoryMonthlyPeriodRepository(),
    categories: new InMemoryCategoryRepository(),
    members: new InMemoryHouseholdMemberRepository(),
  }
}

export interface BuildTestAppOptions {
  repositories?: HttpAppRepositories
  readiness?: ReadinessCheck
}

export function buildTestApp(options: BuildTestAppOptions = {}) {
  const repositories = options.repositories ?? buildTestRepositories()
  return createHttpApp({
    repositories,
    runtimeMode: 'test',
    logger: false,
    readiness: options.readiness,
  })
}
