import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { AuthSessionRow } from '../../../db/types.js'
import { DrizzleAuthSessionRepository } from './drizzle-auth-session-repository.js'
import { HouseholdScopeViolationError, PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function buildRow(overrides: Partial<AuthSessionRow> = {}): AuthSessionRow {
  return {
    id: 1,
    userId: 10,
    householdId: 100,
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date('2026-08-05T00:00:00Z'),
    revokedAt: null,
    createdAt: new Date('2026-08-04T00:00:00Z'),
    lastUsedAt: null,
    ...overrides,
  }
}

function repositoryWith(rows: AuthSessionRow[] = [], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleAuthSessionRepository(db as unknown as DrizzleDb), db }
}

function newSessionInput(overrides: Partial<{ userId: number; householdId: number; tokenHash: string }> = {}) {
  return {
    userId: 10,
    householdId: 100,
    tokenHash: 'd'.repeat(64),
    expiresAt: new Date('2026-08-05T00:00:00Z'),
    createdAt: new Date('2026-08-04T00:00:00Z'),
    ...overrides,
  }
}

describe('DrizzleAuthSessionRepository', () => {
  it('findByTokenHash retorna a sessão mapeada quando encontrada', async () => {
    const { repository } = repositoryWith([buildRow({ id: 5, tokenHash: 'b'.repeat(64) })])
    const session = await repository.findByTokenHash('b'.repeat(64))
    expect(session?.id).toBe(5)
  })

  it('findByTokenHash devolve null quando não encontrada', async () => {
    const { repository } = repositoryWith([buildRow({ tokenHash: 'a'.repeat(64) })])
    expect(await repository.findByTokenHash('c'.repeat(64))).toBeNull()
  })

  describe('create() — id sempre gerado pelo AUTO_INCREMENT nativo, nunca calculado em código', () => {
    it('insere sem fornecer id e devolve o id real gerado pelo insertId do banco', async () => {
      const { repository, db } = repositoryWith([])
      const session = await repository.create(newSessionInput())

      expect(db.insertedValues[0]).not.toHaveProperty('id')
      expect(session.id).toBeTypeOf('number')
      expect(session.revokedAt).toBeNull()
      expect(session.lastUsedAt).toBeNull()
      expect(session.tokenHash).toBe('d'.repeat(64))
    })

    it('duas chamadas sequenciais de create() (dois logins do mesmo usuário) recebem ids diferentes', async () => {
      const { repository } = repositoryWith([])
      const first = await repository.create(newSessionInput({ tokenHash: 'e'.repeat(64) }))
      const second = await repository.create(newSessionInput({ tokenHash: 'f'.repeat(64) }))
      expect(first.id).not.toBe(second.id)
    })

    it('ambas as sessões criadas têm token_hash independente, cada uma com o valor que recebeu', async () => {
      const { repository } = repositoryWith([])
      const first = await repository.create(newSessionInput({ tokenHash: 'e'.repeat(64) }))
      const second = await repository.create(newSessionInput({ tokenHash: 'f'.repeat(64) }))

      expect(first.id).not.toBe(second.id)
      expect(first.tokenHash).toBe('e'.repeat(64))
      expect(second.tokenHash).toBe('f'.repeat(64))
    })

    it('duas criações de usuários diferentes não colidem — cada uma recebe seu próprio id', async () => {
      const { repository } = repositoryWith([])
      const owner = await repository.create(newSessionInput({ userId: 10, tokenHash: 'e'.repeat(64) }))
      const partner = await repository.create(newSessionInput({ userId: 11, tokenHash: 'f'.repeat(64) }))
      expect(owner.id).not.toBe(partner.id)
      expect(owner.userId).toBe(10)
      expect(partner.userId).toBe(11)
    })

    it('create() sempre executa um INSERT novo — nunca um UPDATE sobre uma linha existente', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1 })])
      await repository.create(newSessionInput({ tokenHash: 'novo'.repeat(16) }))
      // A linha pré-existente (id 1) não deve ter sido tocada — só uma nova entrada em insertedValues.
      expect(db.insertedValues).toHaveLength(1)
      expect(db.insertedValues[0]?.tokenHash).toBe('novo'.repeat(16))
    })

    it('falha no INSERT propaga PersistenceError sanitizado e não devolve sessão parcial', async () => {
      const { repository } = repositoryWith([], new Error('falha simulada de conexão'))
      await expect(repository.create(newSessionInput())).rejects.toBeInstanceOf(PersistenceError)
    })
  })

  describe('update() — nunca cria, nunca altera token_hash', () => {
    it('atualiza revokedAt de uma sessão existente do mesmo usuário', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, userId: 10, revokedAt: null })])
      const revokedAt = new Date('2026-08-04T12:00:00Z')
      const updated = await repository.update({
        id: 1,
        userId: 10,
        householdId: 100,
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date('2026-08-05T00:00:00Z'),
        revokedAt,
        createdAt: new Date('2026-08-04T00:00:00Z'),
        lastUsedAt: null,
      })
      expect(updated.revokedAt).toEqual(revokedAt)
    })

    it('nunca regrava token_hash, mesmo se o chamador passar um valor diferente', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, userId: 10, tokenHash: 'a'.repeat(64) })])
      await repository.update({
        id: 1,
        userId: 10,
        householdId: 100,
        tokenHash: 'z'.repeat(64), // nunca deve ir para o SET do UPDATE
        expiresAt: new Date('2026-08-05T00:00:00Z'),
        revokedAt: new Date(),
        createdAt: new Date('2026-08-04T00:00:00Z'),
        lastUsedAt: null,
      })
      // O hash de busca continua sendo o ORIGINAL ('a'), nunca o valor forjado ('z') — prova que o
      // UPDATE real no banco nunca tocaria a coluna token_hash.
      const stillFoundByOriginalHash = await repository.findByTokenHash('a'.repeat(64))
      const neverFoundByForgedHash = await repository.findByTokenHash('z'.repeat(64))
      expect(stillFoundByOriginalHash?.id).toBe(1)
      expect(neverFoundByForgedHash).toBeNull()
    })

    it('rejeita atualizar um id que pertence a outro usuário', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, userId: 10 })])
      await expect(
        repository.update({
          id: 1,
          userId: 999,
          householdId: 100,
          tokenHash: 'a'.repeat(64),
          expiresAt: new Date(),
          revokedAt: null,
          createdAt: new Date(),
          lastUsedAt: null,
        }),
      ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
    })

    it('rejeita atualizar um id inexistente — update() nunca cria', async () => {
      const { repository } = repositoryWith([])
      await expect(
        repository.update({
          id: 999,
          userId: 10,
          householdId: 100,
          tokenHash: 'a'.repeat(64),
          expiresAt: new Date(),
          revokedAt: null,
          createdAt: new Date(),
          lastUsedAt: null,
        }),
      ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
    })

    it('revogar uma sessão não afeta outra sessão do mesmo usuário', async () => {
      const { repository } = repositoryWith([
        buildRow({ id: 1, userId: 10, tokenHash: 'e'.repeat(64), revokedAt: null }),
        buildRow({ id: 2, userId: 10, tokenHash: 'f'.repeat(64), revokedAt: null }),
      ])
      await repository.update({
        id: 1,
        userId: 10,
        householdId: 100,
        tokenHash: 'e'.repeat(64),
        expiresAt: new Date('2026-08-05T00:00:00Z'),
        revokedAt: new Date(),
        createdAt: new Date('2026-08-04T00:00:00Z'),
        lastUsedAt: null,
      })

      const untouched = await repository.findByTokenHash('f'.repeat(64))
      expect(untouched?.revokedAt).toBeNull()
    })

    it('propaga PersistenceError sanitizado quando a leitura de existência falha', async () => {
      const { repository } = repositoryWith([], new Error('falha simulada'))
      await expect(
        repository.update({
          id: 1,
          userId: 10,
          householdId: 100,
          tokenHash: 'a'.repeat(64),
          expiresAt: new Date(),
          revokedAt: null,
          createdAt: new Date(),
          lastUsedAt: null,
        }),
      ).rejects.toBeInstanceOf(PersistenceError)
    })
  })

  it('propaga PersistenceError sanitizado quando findByTokenHash falha', async () => {
    const { repository } = repositoryWith([], new Error('falha simulada'))
    await expect(repository.findByTokenHash('a'.repeat(64))).rejects.toBeInstanceOf(PersistenceError)
  })

  it('o código real (fora de comentários) nunca consulta information_schema nem calcula MAX(id) — o id vem exclusivamente do insertId do banco', () => {
    const source = readFileSync(path.resolve(__dirname, 'drizzle-auth-session-repository.ts'), 'utf-8')
    // Remove comentários de bloco e de linha antes de checar — o histórico do bug (que MENCIONA
    // essas técnicas antigas de propósito, como documentação) fica só em comentário, nunca em código.
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    expect(codeOnly).not.toMatch(/information_schema/i)
    expect(codeOnly).not.toMatch(/MAX\(\s*id\s*\)/i)
    expect(codeOnly).not.toMatch(/nextId/i)
    expect(codeOnly).not.toMatch(/\.execute\(/)
    expect(codeOnly).toMatch(/insertId/)
  })
})
