import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Brand } from './Brand.tsx'

describe('Brand', () => {
  it('renderiza em modo tipográfico quando não há logo oficial', () => {
    render(<Brand />)
    expect(screen.getByText('HouseManager')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renderiza a imagem quando um logoSrc é fornecido', () => {
    render(<Brand logoSrc="/assets/brand/logo.svg" />)
    const image = screen.getByRole('img', { name: 'HouseManager' })
    expect(image.getAttribute('src')).toBe('/assets/brand/logo.svg')
  })

  it('usa a forma compacta "HM" quando solicitado, ainda sem logo', () => {
    render(<Brand compact />)
    expect(screen.getByText('HM')).toBeTruthy()
  })

  it('usa o tamanho "default" quando size não é informado', () => {
    const { container } = render(<Brand logoSrc="/assets/brand/logo.svg" />)
    expect(container.querySelector('.fh-brand')?.getAttribute('data-size')).toBe('default')
  })

  it('aplica data-size="sidebar" quando size="sidebar" é passado, sem alterar a lógica de renderização', () => {
    const { container } = render(<Brand logoSrc="/assets/brand/logo.svg" size="sidebar" />)
    expect(container.querySelector('.fh-brand')?.getAttribute('data-size')).toBe('sidebar')
    const image = screen.getByRole('img', { name: 'HouseManager' })
    expect(image.getAttribute('src')).toBe('/assets/brand/logo.svg')
  })
})
