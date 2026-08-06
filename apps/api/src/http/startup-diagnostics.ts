/**
 * Formata a mensagem final de falha de inicialização, distinguindo a etapa
 * (conexão inicial com o banco vs. vinculação da porta HTTP), a categoria e
 * o código sanitizado — nunca host, porta remota, usuário, senha, URI,
 * certificado ou a mensagem bruta do driver. O rastro de pilha completo só é
 * incluído com `FINANHOUSE_DEBUG_STARTUP=true`, e mesmo assim sem a primeira
 * linha (nome + mensagem do erro), que pode conter fragmentos de host.
 */
export interface StartupFailureClassification {
  category: string
  code: string
}

function sanitizedStackFrames(error: unknown): string[] {
  if (!(error instanceof Error) || typeof error.stack !== 'string') return []
  const [, ...frameLines] = error.stack.split('\n')
  return frameLines.map((line) => line.trim()).filter((line) => line.length > 0)
}

export function formatStartupFailureMessage(
  stage: string,
  classification: StartupFailureClassification,
  error: unknown,
  debugEnabled: boolean,
): string {
  const lines = [
    'Falha ao iniciar o servidor HTTP.',
    `Etapa: ${stage}`,
    `Categoria: ${classification.category}`,
    `Código: ${classification.code}`,
  ]

  if (debugEnabled) {
    const frames = sanitizedStackFrames(error)
    if (frames.length > 0) {
      lines.push('Stack (sanitizado — apenas quadros de chamada, sem a mensagem original):')
      lines.push(...frames)
    }
  }

  return lines.join('\n')
}
