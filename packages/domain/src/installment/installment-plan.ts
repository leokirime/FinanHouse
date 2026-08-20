import type { Money } from '../money/money.js'

/**
 * Agrupador de uma compra parcelada — nunca um segundo motor financeiro:
 * cada parcela gerada a partir dele é conceitualmente uma `FinancialEntry`
 * (ver `GeneratedInstallment` abaixo). Imutável como contrato depois de
 * criado (Sessão 12, Bloco 01) — nenhuma operação de domínio edita
 * `totalAmount`, `installmentCount`, `categoryId`, `firstReferenceMonth` ou
 * `dueDay` de um plano existente nesta primeira versão.
 *
 * `firstReferenceMonth` é deliberadamente uma data solta (`YYYY-MM-01`), não
 * uma referência a uma `MonthlyPeriod` real — a competência da última
 * parcela de um plano longo pode não existir ainda como linha de
 * competência no momento da criação do plano (ver
 * `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/02_analysis/analise_arquitetural.md`).
 * Cada `FinancialEntry` gerada, por outro lado, sempre referencia uma
 * competência real.
 *
 * `dueDay` é a regra-base de vencimento do plano e é **obrigatório** (1–31)
 * — decisão do Bloco 01, reafirmada na revisão do Bloco 02: todo
 * parcelamento neste MVP tem vencimento definido; não existe parcelamento
 * sem `dueDay`.
 *
 * `createdAt` segue o mesmo padrão já usado por `MonthlyPeriod.closedAt`:
 * uma string sempre fornecida por quem chama (nunca gerada dentro do
 * domínio — nenhuma função de domínio deste projeto chama `new Date()`
 * para capturar "agora", o que introduziria não-determinismo numa camada
 * que é deliberadamente pura/testável sem mocks de tempo). Nenhum tipo de
 * domínio existente antes deste bloco carregava um "timestamp de criação"
 * (essa informação sempre foi exclusivamente uma coluna de banco,
 * `TIMESTAMP ... DEFAULT (now())`, nunca exposta a `packages/domain`) — por
 * isso o formato escolhido é uma string ISO 8601 completa (data e hora),
 * e não `YYYY-MM-DD` como `dueDate`/`closedAt`/`referenceMonth` (que
 * representam datas de calendário, não instantes).
 */
export interface InstallmentPlan {
  id: number
  householdId: number
  description: string
  categoryId: number
  totalAmount: Money
  installmentCount: number
  /** Competência da primeira parcela, sempre YYYY-MM-01. */
  firstReferenceMonth: string
  /** Dia-base de vencimento, obrigatório (1–31) — regra de geração original, não reconsultada depois. */
  dueDay: number
  /** Somente autoria/auditoria — nunca filtro de visibilidade (household é a carteira compartilhada, RF-09/DT-14). */
  createdByUserId: number
  /** Instante de criação do plano, ISO 8601 — sempre fornecido por quem chama `createInstallmentPlan`, nunca gerado dentro do domínio. */
  createdAt: string
}

/**
 * Representação pura de domínio de uma parcela gerada pelo Bloco 02
 * (domínio puro, sem persistência/API/frontend) — **não** é, e nunca será,
 * um substituto de `FinancialEntry` na arquitetura final. É um objeto
 * intermediário: o Bloco 04 (serviços/API) usa cada `GeneratedInstallment`
 * para construir a `FinancialEntry` real correspondente (via
 * `createFinancialEntry` já existente, resolvendo `periodId` a partir de
 * `referenceMonth` — competência criada sob demanda, mesmo padrão
 * idempotente já usado pelo resto do domínio) e persistir essa
 * `FinancialEntry`, não este tipo. No modelo final persistido, cada
 * parcela continua sendo uma `FinancialEntry` real vinculada ao
 * `InstallmentPlan` via `installmentPlanId`/`installmentNumber` (extensão
 * do tipo `FinancialEntry` prevista para o Bloco 03 — ver
 * `installment-rules.ts` para a justificativa de por que essa extensão não
 * acontece ainda neste bloco).
 */
export interface GeneratedInstallment {
  installmentPlanId: number
  installmentNumber: number
  householdId: number
  categoryId: number
  description: string
  /** Sempre 'expense' — parcelamento modela compras parceladas (despesas); uma extensão para receitas parceladas ficaria fora deste MVP. */
  entryType: 'expense'
  expectedAmount: Money
  /** Competência desta parcela, YYYY-MM-01 — avança exatamente um mês por parcela a partir de `InstallmentPlan.firstReferenceMonth`. */
  referenceMonth: string
  /** Data de vencimento já resolvida (nunca inválida) — sempre presente, já que `dueDay` é obrigatório no plano. */
  dueDate: string
  /** Sempre 'planned' — mesmo status inicial de qualquer movimentação nova. */
  status: 'planned'
  createdByUserId: number
}
