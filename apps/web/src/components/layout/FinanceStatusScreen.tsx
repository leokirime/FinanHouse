import type { ApiError } from '../../api/api-errors.ts'
import './FinanceStatusScreen.css'

export interface FinanceLoadingScreenProps {
  kind: 'loading'
  title?: string
  description?: string
}

export interface FinanceErrorScreenProps {
  kind: 'error'
  error: ApiError
  onRetry: () => void
}

export type FinanceStatusScreenProps = FinanceLoadingScreenProps | FinanceErrorScreenProps

const ERROR_COPY: Record<ApiError['kind'], { title: string; description: string }> = {
  network: { title: 'API indisponível', description: 'Não foi possível conectar à API local. Confirme se `npm run dev:api` está em execução.' },
  timeout: { title: 'A API demorou para responder', description: 'A requisição excedeu o tempo limite. Tente novamente.' },
  dependency_unavailable: { title: 'API temporariamente indisponível', description: 'A API está de pé, mas uma dependência (ex.: banco) não respondeu a tempo.' },
  config: { title: 'Configuração ausente', description: 'Defina VITE_API_BASE_URL na configuração local do workspace web.' },
  not_found: { title: 'Recurso não encontrado', description: 'A API não encontrou o recurso esperado para a sessão atual.' },
  validation: { title: 'Configuração inválida', description: 'A API rejeitou a requisição inicial por um parâmetro inválido.' },
  domain_conflict: { title: 'Conflito de domínio', description: 'A API recusou a requisição inicial por conflito de regra de domínio.' },
  persistence_conflict: { title: 'Conflito de persistência', description: 'A API recusou a requisição inicial por conflito de persistência.' },
  domain_rule_rejected: { title: 'Regra de domínio rejeitada', description: 'A API rejeitou a requisição inicial por regra de domínio.' },
  persistence_rule_rejected: { title: 'Regra de persistência rejeitada', description: 'A API rejeitou a requisição inicial por regra de persistência.' },
  internal: { title: 'Erro interno da API', description: 'A API encontrou um erro inesperado ao processar a requisição inicial.' },
  cancelled: { title: 'Carregamento cancelado', description: 'O carregamento foi cancelado.' },
  unexpected_response: { title: 'Resposta inesperada da API', description: 'A API respondeu em um formato inesperado.' },
  unauthenticated: { title: 'Sessão expirada', description: 'Sua sessão expirou ou foi encerrada. Entre novamente para continuar.' },
  rate_limited: { title: 'Muitas tentativas', description: 'Aguarde alguns minutos antes de tentar novamente.' },
}

/**
 * Tela de status de página inteira para carregamento inicial e falha —
 * nunca carrega dados demonstrativos como alternativa (DT-12). Cobre
 * indisponibilidade, timeout e configuração ausente com uma mensagem
 * específica para cada caso.
 */
export function FinanceStatusScreen(props: FinanceStatusScreenProps) {
  if (props.kind === 'loading') {
    return (
      <div className="fh-status-screen" role="status" aria-live="polite">
        <div className="fh-status-screen__card">
          <div className="fh-status-screen__spinner" aria-hidden="true" />
          <h1>{props.title ?? 'Carregando o HouseManager'}</h1>
          <p className="fh-text-secondary">{props.description ?? 'Buscando categorias, membros, competência e movimentações na API real.'}</p>
        </div>
      </div>
    )
  }

  const copy = ERROR_COPY[props.error.kind]

  return (
    <div className="fh-status-screen" role="alert">
      <div className="fh-status-screen__card fh-card fh-card--elevated">
        <h1>{copy.title}</h1>
        <p className="fh-text-secondary">{copy.description}</p>
        <p className="fh-text-secondary">{props.error.message}</p>
        <button type="button" className="fh-status-screen__retry" onClick={props.onRetry}>
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
