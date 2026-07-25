import { describe, expect, it } from 'vitest'
import { fireEvent, renderWithProviders, screen } from './test-utils.tsx'
import App from './App.tsx'

describe('App', () => {
  it('renderiza o dashboard com "Visão geral" como navegação ativa por padrão', () => {
    renderWithProviders(<App />)
    const active = screen.getByRole('link', { name: 'Visão geral' })
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('exibe os quatro indicadores principais', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('Receitas realizadas')).toBeTruthy()
    expect(screen.getByText('Despesas realizadas')).toBeTruthy()
    expect(screen.getByText('Saldo realizado')).toBeTruthy()
    expect(screen.getByText('Fechamento projetado')).toBeTruthy()
  })

  it('exibe o status da competência atual (aberta) de forma consistente', () => {
    renderWithProviders(<App />)
    const statusMatches = screen.getAllByText('Aberta')
    expect(statusMatches.length).toBeGreaterThanOrEqual(2) // cabeçalho + hero
  })

  it('exibe o indicador de dados simulados', () => {
    renderWithProviders(<App />)
    expect(screen.getByText(/Dados simulados/)).toBeTruthy()
  })

  it('exibe a lista de movimentações recentes e de pendências próximas', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('Movimentações recentes')).toBeTruthy()
    expect(screen.getByText('Pendências próximas')).toBeTruthy()
    // Uma pendência conhecida das fixtures deve aparecer (pode repetir em
    // "recentes" e "próximas" quando a data cai nos dois recortes).
    expect(screen.getAllByText(/seguro do carro/).length).toBeGreaterThan(0)
  })

  it('mantém a sidebar em modo tipográfico e mostra a logo oficial no hero', () => {
    renderWithProviders(<App />)
    // Sidebar continua sem imagem (modo tipográfico) — nenhuma versão compacta oficial existe ainda.
    expect(screen.getByText('Finanhouse')).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Finanhouse' })).toBeNull()
    // Hero renderiza a logo oficial completa (imagem real, não texto/ícone inventado).
    const heroImage = screen.getByRole('img', { name: 'Finanhouse — Casa, evolução e equilíbrio' })
    expect(heroImage.tagName).toBe('IMG')
  })

  it('nunca renderiza NaN ou Infinity em nenhum valor', () => {
    renderWithProviders(<App />)
    expect(document.body.textContent).not.toContain('NaN')
    expect(document.body.textContent).not.toContain('Infinity')
  })

  it('navega para /movimentacoes ao clicar em "Movimentações", atualizando aria-current e o título do cabeçalho', () => {
    renderWithProviders(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Movimentações' }))

    expect(screen.getByRole('link', { name: 'Movimentações' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Visão geral' }).hasAttribute('aria-current')).toBe(false)
    expect(screen.getByRole('heading', { name: 'Movimentações', level: 1 })).toBeTruthy()
  })

  it('rota desconhecida redireciona com segurança para a Visão geral', () => {
    renderWithProviders(<App />, { initialEntries: ['/rota-que-nao-existe'] })
    expect(screen.getByRole('link', { name: 'Visão geral' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Receitas realizadas')).toBeTruthy()
  })

  it('"Visão geral" continua funcional depois de navegar para Movimentações e voltar', () => {
    renderWithProviders(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Movimentações' }))
    fireEvent.click(screen.getByRole('link', { name: 'Visão geral' }))

    expect(screen.getByRole('link', { name: 'Visão geral' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Receitas realizadas')).toBeTruthy()
  })
})
