import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Brand } from './Brand.tsx'

describe('Brand', () => {
  it('renderiza em modo tipográfico quando não há logo oficial', () => {
    render(<Brand />)
    expect(screen.getByText('Finanhouse')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renderiza a imagem quando um logoSrc é fornecido', () => {
    render(<Brand logoSrc="/assets/brand/logo.svg" />)
    const image = screen.getByRole('img', { name: 'Finanhouse' })
    expect(image.getAttribute('src')).toBe('/assets/brand/logo.svg')
  })

  it('usa a forma compacta "FH" quando solicitado, ainda sem logo', () => {
    render(<Brand compact />)
    expect(screen.getByText('FH')).toBeTruthy()
  })
})
