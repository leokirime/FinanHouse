import type { Category } from '@finanhouse/domain'
import type { CategoryRepository } from '../../../application/ports/category-repository.js'

export class InMemoryCategoryRepository implements CategoryRepository {
  private categories = new Map<number, Category>()

  async findById(id: number): Promise<Category | null> {
    return this.categories.get(id) ?? null
  }

  async findByHousehold(householdId: number): Promise<Category[]> {
    return [...this.categories.values()].filter((category) => category.householdId === householdId)
  }

  /** Popula o repositório para testes/desenvolvimento — não faz parte da interface do domínio. */
  seed(categories: Category[]): void {
    for (const category of categories) this.categories.set(category.id, category)
  }

  reset(): void {
    this.categories.clear()
  }
}
