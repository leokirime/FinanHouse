/**
 * Escreve os documentos sanitizados do inventário em database/current-schema/.
 * Nunca recebe nem escreve credenciais, host, porta, usuário, senha, nome real do
 * banco, string de conexão, ou conteúdo real de linhas — apenas metadados
 * estruturais vindos de information_schema.
 */
import fs from 'node:fs'
import path from 'node:path'

interface TableRow {
  TABLE_NAME: string
  ENGINE: string | null
  TABLE_COLLATION: string | null
  TABLE_ROWS: number | null
}

interface ColumnRow {
  TABLE_NAME: string
  COLUMN_NAME: string
  DATA_TYPE: string
  CHARACTER_MAXIMUM_LENGTH: number | null
  NUMERIC_PRECISION: number | null
  NUMERIC_SCALE: number | null
  IS_NULLABLE: 'YES' | 'NO'
  COLUMN_DEFAULT: string | null
  COLUMN_KEY: string
  EXTRA: string
}

interface IndexRow {
  TABLE_NAME: string
  INDEX_NAME: string
  COLUMN_NAME: string
  NON_UNIQUE: number
  SEQ_IN_INDEX: number
}

interface ForeignKeyRow {
  TABLE_NAME: string
  COLUMN_NAME: string
  CONSTRAINT_NAME: string
  REFERENCED_TABLE_NAME: string
  REFERENCED_COLUMN_NAME: string
}

interface ReferentialRow {
  CONSTRAINT_NAME: string
  TABLE_NAME: string
  REFERENCED_TABLE_NAME: string
  UPDATE_RULE: string
  DELETE_RULE: string
}

interface InventoryData {
  mysqlVersion: string
  tables: TableRow[]
  columns: ColumnRow[]
  indexes: IndexRow[]
  foreignKeys: ForeignKeyRow[]
  referentialConstraints: ReferentialRow[]
}

export function writeInventoryDocs(outputDir: string, data: InventoryData): void {
  fs.mkdirSync(outputDir, { recursive: true })
  const generatedAt = new Date().toISOString().slice(0, 10)

  fs.writeFileSync(path.join(outputDir, 'inspection-summary.md'), renderSummary(data, generatedAt))
  fs.writeFileSync(path.join(outputDir, 'tables.md'), renderTables(data, generatedAt))
  fs.writeFileSync(path.join(outputDir, 'indexes.md'), renderIndexes(data, generatedAt))
  fs.writeFileSync(path.join(outputDir, 'relationships.md'), renderRelationships(data, generatedAt))
  fs.writeFileSync(path.join(outputDir, 'inventory.md'), renderInventoryIndex(data, generatedAt))
}

function renderSummary(data: InventoryData, generatedAt: string): string {
  const emptyNotice =
    data.tables.length === 0
      ? '\n> O banco MySQL existe, mas nenhum schema de aplicação foi encontrado durante a inspeção.\n'
      : ''
  return `# Resumo da Inspeção

> Gerado em: ${generatedAt} · Nenhuma credencial, host, porta, usuário, senha ou nome real do banco é registrado aqui.

- Versão do MySQL: ${data.mysqlVersion}
- Total de tabelas: ${data.tables.length}
- Total de chaves estrangeiras: ${data.foreignKeys.length}
${emptyNotice}
Ver \`tables.md\`, \`indexes.md\`, \`relationships.md\` e \`inventory.md\` para o detalhamento.
`
}

function renderTables(data: InventoryData, generatedAt: string): string {
  const rows = data.tables
    .map((t) => `| ${t.TABLE_NAME} | ${t.ENGINE ?? '—'} | ${t.TABLE_COLLATION ?? '—'} | ${t.TABLE_ROWS ?? '—'} |`)
    .join('\n')

  const columnsByTable = groupBy(data.columns, (c) => c.TABLE_NAME)
  const columnSections = Object.entries(columnsByTable)
    .map(([table, cols]) => {
      const colRows = cols
        .map((c) => {
          const size = formatSize(c)
          const autoIncrement = c.EXTRA?.toLowerCase().includes('auto_increment') ? 'sim' : 'não'
          return `| ${c.COLUMN_NAME} | ${c.DATA_TYPE} | ${size} | ${c.IS_NULLABLE} | ${c.COLUMN_DEFAULT ?? '—'} | ${c.COLUMN_KEY || '—'} | ${autoIncrement} |`
        })
        .join('\n')
      return `### ${table}\n\n| Coluna | Tipo | Tamanho/Precisão | Nulo? | Default | Chave | Auto Increment |\n|---|---|---|---|---|---|---|\n${colRows}\n`
    })
    .join('\n')

  return `# Tabelas

> Gerado em: ${generatedAt} · Estimativa de linhas vem de \`information_schema.tables\` (aproximada, não é \`COUNT(*)\`).

| Tabela | Engine | Collation | Linhas (estimado) |
|---|---|---|---|
${rows || '| — | — | — | — |'}

## Colunas por tabela

${columnSections || '_Nenhuma coluna encontrada._'}
`
}

function formatSize(c: ColumnRow): string {
  if (c.CHARACTER_MAXIMUM_LENGTH != null) return String(c.CHARACTER_MAXIMUM_LENGTH)
  if (c.NUMERIC_PRECISION != null) {
    return c.NUMERIC_SCALE ? `${c.NUMERIC_PRECISION},${c.NUMERIC_SCALE}` : String(c.NUMERIC_PRECISION)
  }
  return '—'
}

function renderIndexes(data: InventoryData, generatedAt: string): string {
  const byTable = groupBy(data.indexes, (i) => i.TABLE_NAME)
  const sections = Object.entries(byTable)
    .map(([table, idxs]) => {
      const byIndexName = groupBy(idxs, (i) => i.INDEX_NAME)
      const idxRows = Object.entries(byIndexName)
        .map(([name, cols]) => {
          const unique = cols[0]?.NON_UNIQUE === 0 ? 'sim' : 'não'
          const columns = cols
            .sort((a, b) => a.SEQ_IN_INDEX - b.SEQ_IN_INDEX)
            .map((c) => c.COLUMN_NAME)
            .join(', ')
          return `| ${name} | ${unique} | ${columns} |`
        })
        .join('\n')
      return `### ${table}\n\n| Índice | Único? | Colunas |\n|---|---|---|\n${idxRows}\n`
    })
    .join('\n')

  return `# Índices

> Gerado em: ${generatedAt}

${sections || '_Nenhum índice encontrado._'}
`
}

function renderRelationships(data: InventoryData, generatedAt: string): string {
  const fkRows = data.foreignKeys
    .map(
      (fk) =>
        `| ${fk.TABLE_NAME}.${fk.COLUMN_NAME} | ${fk.CONSTRAINT_NAME} | ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} |`,
    )
    .join('\n')

  const refRows = data.referentialConstraints
    .map((r) => `| ${r.CONSTRAINT_NAME} | ${r.TABLE_NAME} | ${r.REFERENCED_TABLE_NAME} | ${r.UPDATE_RULE} | ${r.DELETE_RULE} |`)
    .join('\n')

  return `# Relacionamentos

> Gerado em: ${generatedAt}

## Chaves estrangeiras

| Coluna | Constraint | Referencia |
|---|---|---|
${fkRows || '| — | — | — |'}

## Regras referenciais

| Constraint | Tabela | Tabela referenciada | ON UPDATE | ON DELETE |
|---|---|---|---|---|
${refRows || '| — | — | — | — | — |'}
`
}

function renderInventoryIndex(data: InventoryData, generatedAt: string): string {
  const tableList = data.tables.map((t) => `- ${t.TABLE_NAME}`).join('\n')
  const emptyNotice =
    data.tables.length === 0
      ? '\n**O banco MySQL existe, mas nenhum schema de aplicação foi encontrado durante a inspeção.**\n'
      : ''
  return `# Inventário do Banco Existente

> Gerado em: ${generatedAt} · MySQL ${data.mysqlVersion}

Este é o índice do inventário somente leitura. Ver também \`inspection-summary.md\`, \`tables.md\`, \`indexes.md\`, \`relationships.md\`.
${emptyNotice}
## Tabelas encontradas

${tableList || '_Nenhuma tabela encontrada._'}

## Observações

_Preencher manualmente após revisão: inconsistências técnicas, estruturas reutilizáveis, estruturas aparentemente obsoletas, lacunas para o novo domínio._
`
}

function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  const result = {} as Record<K, T[]>
  for (const item of items) {
    const key = keyFn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}
