export interface HealthStatus {
  status: 'ok'
  service: 'finanhouse-api'
}

export function getHealthStatus(): HealthStatus {
  return { status: 'ok', service: 'finanhouse-api' }
}
