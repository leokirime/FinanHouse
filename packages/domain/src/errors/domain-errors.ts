/** Classe-base para todo erro de regra de negócio do domínio Finanhouse. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class InvalidMoneyAmountError extends DomainError {}

export class InvalidStatusTransitionError extends DomainError {}

export class MissingRealizationDataError extends DomainError {}

export class UnexpectedRealizationDataError extends DomainError {}

export class CategoryEntryTypeMismatchError extends DomainError {}

export class InactiveCategoryError extends DomainError {}

export class InactiveHouseholdMemberError extends DomainError {}

export class HouseholdMismatchError extends DomainError {}

export class ClosedPeriodError extends DomainError {}

export class PeriodInReviewError extends DomainError {}

export class InvalidPeriodTransitionError extends DomainError {}

export class PeriodNotFoundError extends DomainError {}

export class FinancialEntryNotFoundError extends DomainError {}

export class CategoryNotFoundError extends DomainError {}

export class HouseholdMemberNotFoundError extends DomainError {}

export class InvalidDateError extends DomainError {}
