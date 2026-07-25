import './Brand.css'

export interface BrandProps {
  /**
   * Caminho para o arquivo de logo oficial (`assets/brand/`), quando existir.
   * Enquanto a logo oficial não é fornecida, o componente usa somente o
   * nome "Finanhouse" em modo tipográfico — nunca um ícone inventado.
   */
  logoSrc?: string
  compact?: boolean
}

export function Brand({ logoSrc, compact = false }: BrandProps) {
  if (logoSrc) {
    return (
      <div className="fh-brand">
        <img src={logoSrc} alt="Finanhouse" className="fh-brand__logo" />
      </div>
    )
  }

  return (
    <div className="fh-brand" data-mode="typographic">
      <span className="fh-brand__name">{compact ? 'FH' : 'Finanhouse'}</span>
    </div>
  )
}
