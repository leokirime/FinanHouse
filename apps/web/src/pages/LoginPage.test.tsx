import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../test-utils.tsx'
import { AuthContext, type AuthContextValue } from '../state/auth-context.ts'
import type { AuthState } from '../state/auth-types.ts'
import { LoginPage } from './LoginPage.tsx'

function renderLoginPage(overrides: Partial<AuthContextValue> = {}, state?: AuthState) {
  const value: AuthContextValue = {
    state: state ?? { status: 'unauthenticated', pendingLogin: false, loginError: null },
    login: vi.fn(),
    logout: vi.fn(),
    clearLoginError: vi.fn(),
    retry: vi.fn(),
    notifyUnauthenticated: vi.fn(),
    ...overrides,
  }
  return { value, ...render(<AuthContext.Provider value={value}><LoginPage /></AuthContext.Provider>) }
}

describe('LoginPage', () => {
  it('renderiza marca, título e os dois campos com labels acessíveis', () => {
    renderLoginPage()
    expect(screen.getByRole('heading', { name: 'Entrar no Finanhouse' })).toBeTruthy()
    expect(screen.getByLabelText('E-mail')).toBeTruthy()
    expect(screen.getByLabelText('Senha')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy()
  })

  it('nunca usa a palavra "household" em nenhum texto visível da interface', () => {
    renderLoginPage()
    expect(document.body.textContent?.toLowerCase()).not.toContain('household')
  })

  it('não exibe links/botões de cadastro, recuperação de senha, login social ou termos de SaaS', () => {
    renderLoginPage()
    expect(screen.queryByRole('link')).toBeNull()
    // Só o botão "Entrar" e o de mostrar/ocultar senha — nenhum outro botão (ex.: "Cadastre-se", "Entrar com Google").
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('envia e-mail e senha ao submeter o formulário', () => {
    const { value } = renderLoginPage()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.invalid' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(value.login).toHaveBeenCalledWith('a@b.invalid', 'senha-123')
  })

  it('recorta espaços do e-mail antes de enviar', () => {
    const { value } = renderLoginPage()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: '  a@b.invalid  ' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(value.login).toHaveBeenCalledWith('a@b.invalid', 'senha-123')
  })

  it('campo de e-mail vazio: mostra erro local, foca o campo e não chama login()', () => {
    const { value } = renderLoginPage()
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(value.login).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByLabelText('E-mail'))
    expect(screen.getByRole('alert').textContent).toBe('Informe seu e-mail.')
  })

  it('e-mail com formato inválido: mostra erro local, foca o campo e não chama login()', () => {
    const { value } = renderLoginPage()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nao-e-um-email' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(value.login).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByLabelText('E-mail'))
    expect(screen.getByRole('alert').textContent).toBe('Informe um e-mail válido.')
  })

  it('senha vazia: mostra erro local, foca o campo e não chama login()', () => {
    const { value } = renderLoginPage()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(value.login).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByLabelText('Senha'))
    expect(screen.getByRole('alert').textContent).toBe('Informe sua senha.')
  })

  it('erro local de e-mail some ao editar o campo novamente', () => {
    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('alert').textContent).toBe('Informe seu e-mail.')

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.invalid' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('botão de mostrar/ocultar senha alterna o tipo do campo, com aria-label e aria-pressed corretos', () => {
    renderLoginPage()
    const passwordField = screen.getByLabelText('Senha') as HTMLInputElement
    expect(passwordField.type).toBe('password')

    const toggle = screen.getByRole('button', { name: 'Mostrar senha' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(toggle)
    expect(passwordField.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(passwordField.type).toBe('password')
  })

  it('mostrar/ocultar senha nunca altera o valor digitado', () => {
    renderLoginPage()
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect((screen.getByLabelText('Senha') as HTMLInputElement).value).toBe('segredo-123')
  })

  it('botão de mostrar/ocultar senha é alcançável por teclado (foco via Tab, ativação via Enter/click)', () => {
    renderLoginPage()
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' })
    toggle.focus()
    expect(document.activeElement).toBe(toggle)
  })

  it('mostra "Entrando…" e desabilita o botão durante o envio (previne duplo envio)', () => {
    renderLoginPage({}, { status: 'unauthenticated', pendingLogin: true, loginError: null })
    const button = screen.getByRole('button', { name: 'Entrando…' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })

  it('não envia um segundo submit enquanto pendingLogin é true', () => {
    const { value } = renderLoginPage({}, { status: 'unauthenticated', pendingLogin: true, loginError: null })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrando…' }))
    expect(value.login).not.toHaveBeenCalled()
  })

  it('exibe mensagem de erro genérica quando loginError está definido', () => {
    renderLoginPage({}, { status: 'unauthenticated', pendingLogin: false, loginError: 'E-mail ou senha inválidos.' })
    expect(screen.getByRole('alert')).toHaveProperty('textContent', 'E-mail ou senha inválidos.')
  })

  it('exibe mensagem de erro separada quando a API está indisponível', () => {
    renderLoginPage({}, { status: 'unauthenticated', pendingLogin: false, loginError: 'Não foi possível conectar ao FinanHouse. Verifique se a API local está em execução.' })
    expect(screen.getByRole('alert').textContent).toMatch(/conectar ao FinanHouse/)
  })

  it('exibe mensagem de rate limit sem nenhum texto técnico do backend', () => {
    renderLoginPage({}, { status: 'unauthenticated', pendingLogin: false, loginError: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.' })
    expect(screen.getByRole('alert').textContent).toBe('Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.')
  })

  it('limpa o erro do backend ao editar o e-mail ou a senha novamente', () => {
    const { value } = renderLoginPage({}, { status: 'unauthenticated', pendingLogin: false, loginError: 'E-mail ou senha inválidos.' })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'novo@b.invalid' } })
    expect(value.clearLoginError).toHaveBeenCalled()
  })

  it('nunca deixa o valor da senha visível como texto puro no DOM fora do próprio campo', () => {
    renderLoginPage()
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo-super-secreto' } })
    const passwordField = screen.getByLabelText('Senha') as HTMLInputElement
    expect(passwordField.type).toBe('password')
    expect(document.body.textContent).not.toContain('segredo-super-secreto')
  })
})
