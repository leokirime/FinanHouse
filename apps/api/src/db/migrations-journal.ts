import { readFileSync } from 'node:fs'

export class MigrationsJournalError extends Error {}

/**
 * Lê e valida minimamente o journal oficial de migrations
 * (`database/migrations/meta/_journal.json`) — única fonte de verdade para
 * quantas migrations o banco alvo deveria ter aplicadas antes do bootstrap
 * estrutural (Sessão 14, Bloco 03, FASE D.1 — substitui o número fixo que
 * datava do Bloco 17 e já estava obsoleto frente às migrations reais do
 * projeto). Extraída de `db-bootstrap-household.ts` para ser testável de
 * forma isolada, sem executar o script (que abre conexão real ao carregar).
 *
 * Fail-closed: arquivo ausente, JSON inválido ou formato inesperado (campo
 * `entries` ausente/não-array) são todos erros fatais, sanitizados — nunca
 * expõem o caminho completo do sistema de arquivos nem o conteúdo do
 * arquivo, apenas o fato de que o journal não pôde ser lido.
 */
export function readExpectedMigrationCount(journalPath: string): number {
  let raw: string
  try {
    raw = readFileSync(journalPath, 'utf-8')
  } catch {
    throw new MigrationsJournalError(
      'Journal oficial de migrations não encontrado — bootstrap abortado antes de qualquer conexão.',
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new MigrationsJournalError(
      'Journal oficial de migrations não é um JSON válido — bootstrap abortado antes de qualquer conexão.',
    )
  }

  const entries = (parsed as { entries?: unknown } | null)?.entries
  if (!Array.isArray(entries)) {
    throw new MigrationsJournalError(
      'Journal oficial de migrations não tem o formato esperado (campo "entries" ausente ou inválido) — bootstrap abortado antes de qualquer conexão.',
    )
  }

  return entries.length
}
