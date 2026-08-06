/**
 * Identidade técnica mínima de um usuário — não há modelagem de domínio para
 * `User` em `@finanhouse/domain` (mesma decisão de DT-10: nenhuma regra de
 * negócio financeira sobre usuários, só identidade). Nunca inclui campos
 * derivados de outra tabela (household, papel) — isso vem de
 * `HouseholdMemberRepository`.
 */
export interface AuthUserRecord {
  id: number
  displayName: string
  email: string
  status: 'active' | 'inactive'
  passwordHash: string | null
}

/** Somente leitura — não existe rota de criação/edição de usuário (sem cadastro público, DT-14). */
export interface UserRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>
  findById(id: number): Promise<AuthUserRecord | null>
}
