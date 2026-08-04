import type { SQL } from 'drizzle-orm'

/**
 * Double leve da instância Drizzle, usado apenas nos testes unitários dos
 * repositórios — nunca abre conexão real. Em vez de devolver dados
 * canônicos fixos, interpreta as condições `eq()`/`and()` passadas a
 * `.where()` contra as linhas fornecidas, para que os testes de isolamento
 * por household exerçam o filtro de verdade, não apenas dados combinados de
 * antemão. Não simula o repositório inteiro — apenas a superfície mínima do
 * query builder que os repositórios Drizzle reais usam (`select/insert/update/execute`).
 */

interface EqCondition {
  column: string
  value: unknown
}

function isColumnChunk(chunk: unknown): chunk is { name: string } {
  return (
    typeof chunk === 'object' &&
    chunk !== null &&
    'name' in chunk &&
    typeof (chunk as { name: unknown }).name === 'string' &&
    'columnType' in chunk
  )
}

function isParamChunk(chunk: unknown): chunk is { value: unknown } {
  return typeof chunk === 'object' && chunk !== null && 'value' in chunk && 'encoder' in chunk
}

function hasQueryChunks(node: unknown): node is { queryChunks: unknown[] } {
  return typeof node === 'object' && node !== null && Array.isArray((node as { queryChunks?: unknown }).queryChunks)
}

/** Extrai pares {coluna, valor} de qualquer árvore `eq()`/`and()`, percorrendo `queryChunks` recursivamente. */
function extractEqConditions(node: unknown): EqCondition[] {
  const found: EqCondition[] = []
  if (!hasQueryChunks(node)) return found

  let pendingColumn: string | undefined
  for (const chunk of node.queryChunks) {
    if (isColumnChunk(chunk)) {
      pendingColumn = chunk.name
      continue
    }
    if (isParamChunk(chunk)) {
      if (pendingColumn) found.push({ column: pendingColumn, value: chunk.value })
      pendingColumn = undefined
      continue
    }
    found.push(...extractEqConditions(chunk))
  }
  return found
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())
}

function rowMatchesCondition(row: Record<string, unknown>, condition: SQL): boolean {
  const conditions = extractEqConditions(condition)
  return conditions.every(({ column, value }) => row[snakeToCamel(column)] === value)
}

type Row = Record<string, unknown>

interface SelectChain extends PromiseLike<Row[]> {
  where(condition: SQL): SelectChain
  limit(count: number): Promise<Row[]>
}

export class FakeDrizzleDb {
  public insertedValues: Row[] = []

  constructor(
    private rows: Row[] = [],
    private readonly failWith?: unknown,
  ) {}

  select() {
    return {
      from: (): SelectChain => this.buildSelectChain(this.rows),
    }
  }

  private buildSelectChain(source: Row[]): SelectChain {
    let filtered = source
    const chain: SelectChain = {
      where: (condition: SQL) => {
        filtered = filtered.filter((row) => rowMatchesCondition(row, condition))
        return chain
      },
      limit: (count: number) => {
        if (this.failWith) return Promise.reject(this.failWith)
        return Promise.resolve(filtered.slice(0, count))
      },
      then: (onFulfilled, onRejected) => {
        const promise = this.failWith ? Promise.reject(this.failWith) : Promise.resolve(filtered)
        return promise.then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  /** `insert(table).values(values)` — INSERT simples, sem upsert (nenhum repositório real usa `onDuplicateKeyUpdate`). */
  insert() {
    return {
      values: (values: Row): Promise<[{ insertId: number }, unknown]> => {
        if (this.failWith) return Promise.reject(this.failWith)
        this.insertedValues.push(values)
        this.rows.push(values)
        const insertId = typeof values.id === 'number' ? values.id : this.rows.length
        return Promise.resolve([{ insertId }, []])
      },
    }
  }

  /** `update(table).set(values).where(condition)` — só afeta linhas que casam com a condição, como um UPDATE real. */
  update() {
    return {
      set: (setValues: Row) => ({
        where: (condition: SQL): Promise<[{ affectedRows: number }, unknown]> => {
          if (this.failWith) return Promise.reject(this.failWith)
          let affectedRows = 0
          this.rows = this.rows.map((row) => {
            if (!rowMatchesCondition(row, condition)) return row
            affectedRows += 1
            const updated = { ...row, ...setValues }
            this.insertedValues.push(updated)
            return updated
          })
          return Promise.resolve([{ affectedRows }, []])
        },
      }),
    }
  }

  /** `delete(table).where(condition)` — só remove linhas que casam com a condição, como um DELETE real. */
  delete() {
    return {
      where: (condition: SQL): Promise<[{ affectedRows: number }, unknown]> => {
        if (this.failWith) return Promise.reject(this.failWith)
        const before = this.rows.length
        this.rows = this.rows.filter((row) => !rowMatchesCondition(row, condition))
        const affectedRows = before - this.rows.length
        return Promise.resolve([{ affectedRows }, []])
      },
    }
  }

  execute(_query: unknown): Promise<[Row[], unknown]> {
    if (this.failWith) return Promise.reject(this.failWith)
    return Promise.resolve([this.executeRows, []])
  }

  executeRows: Row[] = []
}
