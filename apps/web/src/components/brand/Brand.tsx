import './Brand.css'

export interface BrandProps {
  /**
   * Caminho para o arquivo de logo oficial (`assets/images/`), quando
   * fornecido. Enquanto nenhum `logoSrc` é passado, o componente usa
   * somente o nome "HouseManager" em modo tipográfico — nunca um ícone
   * inventado.
   */
  logoSrc?: string
  compact?: boolean
  /**
   * Contexto de uso — controla apenas o dimensionamento via CSS
   * (`data-size`), nunca a lógica de renderização. `'sidebar'` é usado na
   * navegação lateral (ocorrência institucional permanente, maior que o
   * modo padrão); `'default'` é o tamanho compacto original.
   */
  size?: 'default' | 'sidebar'
}

export function Brand({ logoSrc, compact = false, size = 'default' }: BrandProps) {
  if (logoSrc) {
    return (
      <div className="fh-brand" data-size={size}>
        <img src={logoSrc} alt="HouseManager" className="fh-brand__logo" />
      </div>
    )
  }

  return (
    <div className="fh-brand" data-mode="typographic" data-size={size}>
      <span className="fh-brand__name">{compact ? 'HM' : 'HouseManager'}</span>
    </div>
  )
}
