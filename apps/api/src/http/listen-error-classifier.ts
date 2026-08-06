/**
 * Classifica uma falha de `app.listen()` — nunca um erro de banco de
 * dados, mesmo que ocorra logo após a conexão inicial já ter sido validada.
 * Existe separadamente de `db/connection-error-classifier.ts` porque
 * reaproveitar o classificador de banco aqui rotulava falhas de porta
 * (`EADDRINUSE`, por exemplo uma instância anterior do `tsx watch` ainda
 * liberando a porta) como "erro de banco de dados não classificado" — a
 * causa raiz de uma falha intermitente de inicialização investigada no
 * Bloco 19 (ver DT-14 e a auditoria correspondente).
 */
export interface ListenErrorClassification {
  category: string
  code: string
}

interface CodedErrorLike {
  code?: unknown
}

function hasCode(value: unknown): value is CodedErrorLike {
  return typeof value === 'object' && value !== null && 'code' in value
}

export function classifyListenError(error: unknown): ListenErrorClassification {
  const code = hasCode(error) && typeof error.code === 'string' && error.code.length > 0 ? error.code : 'UNKNOWN'

  if (code === 'EADDRINUSE') return { category: 'porta já em uso', code }
  if (code === 'EACCES') return { category: 'permissão negada para abrir a porta', code }
  if (code === 'EADDRNOTAVAIL') return { category: 'endereço local indisponível', code }

  return { category: 'erro desconhecido ao vincular o servidor HTTP', code }
}
