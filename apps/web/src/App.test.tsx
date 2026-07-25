import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('renderiza o dashboard com "Visão geral" como navegação ativa', () => {
    render(<App />)
    const active = screen.getByRole('button', { name: 'Visão geral' })
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('exibe os quatro indicadores principais', () => {
    render(<App />)
    expect(screen.getByText('Receitas realizadas')).toBeTruthy()
    expect(screen.getByText('Despesas realizadas')).toBeTruthy()
    expect(screen.getByText('Saldo realizado')).toBeTruthy()
    expect(screen.getByText('Fechamento projetado')).toBeTruthy()
  })

  it('exibe o status da competência atual (em revisão) de forma consistente', () => {
    render(<App />)
    const statusMatches = screen.getAllByText('Em revisão')
    expect(statusMatches.length).toBeGreaterThanOrEqual(2) // cabeçalho + apresentação da competência
  })

  it('exibe o indicador de dados simulados', () => {
    render(<App />)
    expect(screen.getByText(/Dados simulados/)).toBeTruthy()
  })

  it('exibe a lista de movimentações recentes e de pendências próximas', () => {
    render(<App />)
    expect(screen.getByText('Movimentações recentes')).toBeTruthy()
    expect(screen.getByText('Pendências próximas')).toBeTruthy()
    // Uma pendência conhecida das fixtures deve aparecer (pode repetir em
    // "recentes" e "próximas" quando a data cai nos dois recortes).
    expect(screen.getAllByText(/seguro do carro/).length).toBeGreaterThan(0)
  })

  it('mantém a sidebar em modo tipográfico e mostra a logo oficial no hero', () => {
    render(<App />)
    // Sidebar continua sem imagem (modo tipográfico) — nenhuma versão compacta oficial existe ainda.
    expect(screen.getByText('Finanhouse')).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Finanhouse' })).toBeNull()
    // Hero renderiza a logo oficial completa (imagem real, não texto/ícone inventado).
    const heroImage = screen.getByRole('img', { name: 'Finanhouse — Casa, evolução e equilíbrio' })
    expect(heroImage.tagName).toBe('IMG')
  })

  it('nunca renderiza NaN ou Infinity em nenhum valor', () => {
    render(<App />)
    expect(document.body.textContent).not.toContain('NaN')
    expect(document.body.textContent).not.toContain('Infinity')
  })
})
