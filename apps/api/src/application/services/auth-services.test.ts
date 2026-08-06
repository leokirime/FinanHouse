import type { HouseholdMember } from '@finanhouse/domain'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuthSessionRepository } from '../../infrastructure/repositories/memory/in-memory-auth-session-repository.js'
import { InMemoryHouseholdMemberRepository } from '../../infrastructure/repositories/memory/in-memory-household-member-repository.js'
import { InMemoryUserRepository } from '../../infrastructure/repositories/memory/in-memory-user-repository.js'
import { hashPassword } from '../../security/password-hashing.js'
import { InvalidCredentialsError, SessionNotFoundError } from '../auth-errors.js'
import type { AuthUserRecord } from '../ports/user-repository.js'
import { LoginService, LogoutService, ValidateSessionService } from './auth-services.js'

const HOUSEHOLD_ID = 1
const OTHER_HOUSEHOLD_ID = 2

const activeMember: HouseholdMember = { id: 1, householdId: HOUSEHOLD_ID, userId: 10, role: 'owner', status: 'active' }
const inactiveMemberOtherHousehold: HouseholdMember = { id: 2, householdId: OTHER_HOUSEHOLD_ID, userId: 11, role: 'member', status: 'inactive' }
const secondActiveMember: HouseholdMember = { id: 4, householdId: HOUSEHOLD_ID, userId: 13, role: 'member', status: 'active' }

describe('serviços de autenticação (repositórios em memória)', () => {
  const users = new InMemoryUserRepository()
  const members = new InMemoryHouseholdMemberRepository()
  const sessions = new InMemoryAuthSessionRepository()
  const deps = { users, members, sessions }

  let activeUser: AuthUserRecord
  let userWithoutPassword: AuthUserRecord
  let inactiveUser: AuthUserRecord
  let secondActiveUser: AuthUserRecord

  beforeEach(async () => {
    users.reset()
    members.reset()
    sessions.reset()

    activeUser = { id: 10, displayName: 'Dona da Casa', email: 'owner@finanhouse.invalid', status: 'active', passwordHash: await hashPassword('senha-correta-123') }
    userWithoutPassword = { id: 11, displayName: 'Sem Senha', email: 'sem-senha@finanhouse.invalid', status: 'active', passwordHash: null }
    inactiveUser = { id: 12, displayName: 'Inativa', email: 'inativa@finanhouse.invalid', status: 'inactive', passwordHash: await hashPassword('qualquer-senha') }
    secondActiveUser = { id: 13, displayName: 'Parceiro da Casa', email: 'parceiro@finanhouse.invalid', status: 'active', passwordHash: await hashPassword('outra-senha-456') }

    users.seed([activeUser, userWithoutPassword, inactiveUser, secondActiveUser])
    members.seed([
      activeMember,
      inactiveMemberOtherHousehold,
      { id: 3, householdId: HOUSEHOLD_ID, userId: 12, role: 'member', status: 'active' },
      secondActiveMember,
    ])
  })

  describe('LoginService', () => {
    it('autentica com e-mail e senha corretos e cria uma sessão real', async () => {
      const result = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      expect(result.user.id).toBe(activeUser.id)
      expect(result.householdId).toBe(HOUSEHOLD_ID)
      expect(result.rawToken.length).toBeGreaterThan(0)
      expect(result.session.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('rejeita senha incorreta com mensagem genérica', async () => {
      await expect(new LoginService(deps).execute({ email: activeUser.email, password: 'senha-errada' })).rejects.toBeInstanceOf(InvalidCredentialsError)
    })

    it('rejeita e-mail inexistente com a mesma mensagem genérica (nunca revela ausência do e-mail)', async () => {
      await expect(new LoginService(deps).execute({ email: 'ninguem@finanhouse.invalid', password: 'qualquer-coisa' })).rejects.toBeInstanceOf(InvalidCredentialsError)
    })

    it('rejeita usuário sem senha configurada ainda', async () => {
      await expect(new LoginService(deps).execute({ email: userWithoutPassword.email, password: 'qualquer-coisa' })).rejects.toBeInstanceOf(InvalidCredentialsError)
    })

    it('rejeita usuário inativo mesmo com senha correta', async () => {
      await expect(new LoginService(deps).execute({ email: inactiveUser.email, password: 'qualquer-senha' })).rejects.toBeInstanceOf(InvalidCredentialsError)
    })

    it('rejeita usuário sem vínculo ativo com nenhum household', async () => {
      const userWithoutActiveMembership: AuthUserRecord = {
        id: 99,
        displayName: 'Órfã',
        email: 'orfa@finanhouse.invalid',
        status: 'active',
        passwordHash: await hashPassword('senha-99'),
      }
      users.seed([userWithoutActiveMembership])
      await expect(new LoginService(deps).execute({ email: userWithoutActiveMembership.email, password: 'senha-99' })).rejects.toBeInstanceOf(InvalidCredentialsError)
    })

    it('nunca inclui passwordHash no resultado retornado', async () => {
      const result = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      expect(result.user).not.toHaveProperty('passwordHash')
    })
  })

  describe('ValidateSessionService', () => {
    it('valida um token de sessão recém-criado', async () => {
      const { rawToken } = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      const validated = await new ValidateSessionService(deps).execute(rawToken)
      expect(validated.user.id).toBe(activeUser.id)
      expect(validated.session.householdId).toBe(HOUSEHOLD_ID)
    })

    it('rejeita um token inexistente', async () => {
      await expect(new ValidateSessionService(deps).execute('token-nunca-emitido')).rejects.toBeInstanceOf(SessionNotFoundError)
    })

    it('rejeita uma sessão expirada', async () => {
      const { rawToken, session } = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      await sessions.update({ ...session, expiresAt: new Date(Date.now() - 1000) })
      await expect(new ValidateSessionService(deps).execute(rawToken)).rejects.toBeInstanceOf(SessionNotFoundError)
    })

    it('rejeita uma sessão revogada', async () => {
      const { rawToken } = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      await new LogoutService(deps).execute(rawToken)
      await expect(new ValidateSessionService(deps).execute(rawToken)).rejects.toBeInstanceOf(SessionNotFoundError)
    })

    it('atualiza lastUsedAt ao validar', async () => {
      const { rawToken, session } = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      expect(session.lastUsedAt).toBeNull()
      const validated = await new ValidateSessionService(deps).execute(rawToken)
      expect(validated.session.lastUsedAt).not.toBeNull()
    })
  })

  describe('LogoutService', () => {
    it('revoga uma sessão válida', async () => {
      const { rawToken } = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      await new LogoutService(deps).execute(rawToken)
      await expect(new ValidateSessionService(deps).execute(rawToken)).rejects.toBeInstanceOf(SessionNotFoundError)
    })

    it('é idempotente — revogar duas vezes não lança', async () => {
      const { rawToken } = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      await new LogoutService(deps).execute(rawToken)
      await expect(new LogoutService(deps).execute(rawToken)).resolves.toBeUndefined()
    })

    it('token nunca emitido não lança (idempotente por definição)', async () => {
      await expect(new LogoutService(deps).execute('token-nunca-emitido')).resolves.toBeUndefined()
    })
  })

  /**
   * Regressão do risco de concorrência apontado após a primeira correção
   * (`MAX(id) + 1`): `create()` nunca deve depender de um `id` calculado em
   * código — cada login precisa gerar uma sessão genuinamente independente,
   * nunca sobrescrever ou invalidar uma sessão anterior do mesmo usuário.
   */
  describe('múltiplos logins do mesmo usuário — sessões independentes', () => {
    it('dois logins consecutivos geram sessões com ids diferentes', async () => {
      const first = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      const second = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      expect(first.session.id).not.toBe(second.session.id)
    })

    it('os dois tokens continuam válidos simultaneamente — nenhum invalida o outro', async () => {
      const first = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      const second = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })

      await expect(new ValidateSessionService(deps).execute(first.rawToken)).resolves.toBeDefined()
      await expect(new ValidateSessionService(deps).execute(second.rawToken)).resolves.toBeDefined()
    })

    it('logout de uma sessão não revoga a outra', async () => {
      const first = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      const second = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })

      await new LogoutService(deps).execute(first.rawToken)

      await expect(new ValidateSessionService(deps).execute(first.rawToken)).rejects.toBeInstanceOf(SessionNotFoundError)
      await expect(new ValidateSessionService(deps).execute(second.rawToken)).resolves.toBeDefined()
    })
  })

  describe('logins de usuários diferentes — sem colisão', () => {
    it('dois usuários diferentes conseguem logar sem colisão de sessão', async () => {
      const owner = await new LoginService(deps).execute({ email: activeUser.email, password: 'senha-correta-123' })
      const partner = await new LoginService(deps).execute({ email: secondActiveUser.email, password: 'outra-senha-456' })

      expect(owner.session.id).not.toBe(partner.session.id)
      await expect(new ValidateSessionService(deps).execute(owner.rawToken)).resolves.toBeDefined()
      await expect(new ValidateSessionService(deps).execute(partner.rawToken)).resolves.toBeDefined()
    })
  })
})
