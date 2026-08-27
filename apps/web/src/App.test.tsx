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

  it('exibe a lista de movimentações recentes e de pendências próximas', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('Movimentações recentes')).toBeTruthy()
    expect(screen.getByText('Pendências próximas')).toBeTruthy()
    // Uma pendência conhecida das fixtures deve aparecer (pode repetir em
    // "recentes" e "próximas" quando a data cai nos dois recortes).
    expect(screen.getAllByText(/seguro do carro/).length).toBeGreaterThan(0)
  })

  it('exibe a marca oficial duas vezes: institucional na sidebar e decorativa no hero', () => {
    renderWithProviders(<App />)
    // Sidebar: ocorrência institucional permanente, imagem real (não mais modo tipográfico).
    const sidebarImage = screen.getByRole('img', { name: 'HouseManager' })
    expect(sidebarImage.getAttribute('src')).toMatch(/finanhouse-logo-hero/)
    // Hero: ocorrência decorativa, imagem real com o slogan completo no alt.
    const heroImage = screen.getByRole('img', { name: 'HouseManager — Casa, evolução e equilíbrio' })
    expect(heroImage.tagName).toBe('IMG')
    // As duas são elementos <img> distintos — nunca a mesma ocorrência duplicada por engano.
    expect(sidebarImage).not.toBe(heroImage)
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

  it('navega para /comparativo ao clicar em "Comparativo", atualizando aria-current e o título do cabeçalho', () => {
    renderWithProviders(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Comparativo' }))

    expect(screen.getByRole('link', { name: 'Comparativo' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Visão geral' }).hasAttribute('aria-current')).toBe(false)
    expect(screen.getByRole('heading', { name: 'Comparativo', level: 1 })).toBeTruthy()
    expect(screen.getByText('Comparação por categoria')).toBeTruthy()
  })

  it('navega para /planejamento ao clicar em "Planejamento", atualizando aria-current e o título do cabeçalho', () => {
    renderWithProviders(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Planejamento' }))

    expect(screen.getByRole('link', { name: 'Planejamento' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Visão geral' }).hasAttribute('aria-current')).toBe(false)
    expect(screen.getByRole('heading', { name: 'Planejamento', level: 1 })).toBeTruthy()
    expect(screen.getAllByText('Despesas previstas').length).toBeGreaterThan(0)
  })

  it('navega para /historico ao clicar em "Histórico", atualizando aria-current e o título do cabeçalho', () => {
    renderWithProviders(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Histórico' }))

    expect(screen.getByRole('link', { name: 'Histórico' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Visão geral' }).hasAttribute('aria-current')).toBe(false)
    expect(screen.getByRole('heading', { name: 'Histórico', level: 1 })).toBeTruthy()
    expect(screen.getAllByText('Movimentações da competência').length).toBeGreaterThan(0)
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

  it('a navegação entre rotas não recarrega a página inteira (react-router intercepta o clique)', () => {
    renderWithProviders(<App />)
    const link = screen.getByRole('link', { name: 'Comparativo' })
    // fireEvent.click devolve o resultado de dispatchEvent: false quando o
    // handler do <Link> chamou preventDefault() — prova de que a navegação
    // foi tratada via history do react-router, não via navegação nativa do
    // navegador (que recarregaria o documento inteiro).
    const dispatched = fireEvent.click(link)
    expect(dispatched).toBe(false)
  })
})
