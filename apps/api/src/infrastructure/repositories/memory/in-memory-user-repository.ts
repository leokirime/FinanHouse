import type { AuthUserRecord, UserRepository } from '../../../application/ports/user-repository.js'

export class InMemoryUserRepository implements UserRepository {
  private usersById = new Map<number, AuthUserRecord>()

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    return [...this.usersById.values()].find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
  }

  async findById(id: number): Promise<AuthUserRecord | null> {
    return this.usersById.get(id) ?? null
  }

  /** Popula o repositório para testes — não faz parte da interface do domínio. */
  seed(users: AuthUserRecord[]): void {
    for (const user of users) this.usersById.set(user.id, user)
  }

  reset(): void {
    this.usersById.clear()
  }
}
