import type { Category } from '@finanhouse/domain'
import {
  DEFAULT_FINANCIAL_ENTRIES_FILTERS,
  ENTRY_STATUS_LABELS,
  type EntryStatusFilter,
  type EntryTypeFilter,
  type FinancialEntriesFilters,
} from '../../view-models/financial-entries-view-model.ts'
import './FinancialEntryFilters.css'

export interface FinancialEntryFiltersProps {
  filters: FinancialEntriesFilters
  categories: Category[]
  onChange: (filters: FinancialEntriesFilters) => void
}

function isDefaultFilters(filters: FinancialEntriesFilters): boolean {
  return (
    filters.type === 'all' && filters.status === 'all' && filters.categoryId === 'all' && filters.search.trim() === ''
  )
}

export function FinancialEntryFilters({ filters, categories, onChange }: FinancialEntryFiltersProps) {
  function update(partial: Partial<FinancialEntriesFilters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div className="fh-card fh-entry-filters">
      <label className="fh-entry-filters__field fh-entry-filters__field--search">
        <span className="fh-visually-hidden">Buscar por descrição ou categoria</span>
        <input
          type="search"
          placeholder="Buscar por descrição ou categoria"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
        />
      </label>

      <label className="fh-entry-filters__field">
        <span className="fh-visually-hidden">Tipo</span>
        <select value={filters.type} onChange={(event) => update({ type: event.target.value as EntryTypeFilter })}>
          <option value="all">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
      </label>

      <label className="fh-entry-filters__field">
        <span className="fh-visually-hidden">Status</span>
        <select value={filters.status} onChange={(event) => update({ status: event.target.value as EntryStatusFilter })}>
          <option value="all">Todos os status</option>
          {Object.entries(ENTRY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="fh-entry-filters__field">
        <span className="fh-visually-hidden">Categoria</span>
        <select
          value={filters.categoryId === 'all' ? 'all' : String(filters.categoryId)}
          onChange={(event) => update({ categoryId: event.target.value === 'all' ? 'all' : Number(event.target.value) })}
        >
          <option value="all">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="fh-entry-filters__clear"
        onClick={() => onChange(DEFAULT_FINANCIAL_ENTRIES_FILTERS)}
        disabled={isDefaultFilters(filters)}
      >
        Limpar filtros
      </button>
    </div>
  )
}
