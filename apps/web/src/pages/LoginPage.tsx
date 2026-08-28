import { useId, useRef, useState, type FormEvent } from 'react'
import housemanagerLogo from '../../../../assets/images/HouseManager.png'
import { useAuth } from '../hooks/use-auth.ts'
import './LoginPage.css'

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <line x1="3" y1="21" x2="21" y2="3" />}
    </svg>
  )
}

/**
 * Tela de login real (Bloco 19, DT-14) — sem cadastro público: só e-mail e
 * senha de um usuário já vinculado à residência. Nunca revela se um e-mail
 * existe (mensagem sempre genérica, vinda de `AuthProvider`/API). Nunca
 * armazena a senha localmente além do estado do próprio formulário.
 */
export function LoginPage() {
  const { state, login, clearLoginError } = useAuth()
  const emailId = useId()
  const passwordId = useId()
  const emailErrorId = useId()
  const passwordErrorId = useId()
  const formErrorId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null)
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(null)

  const pendingLogin = state.status === 'unauthenticated' && state.pendingLogin
  const loginError = state.status === 'unauthenticated' ? state.loginError : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pendingLogin) return

    const trimmedEmail = email.trim()

    if (trimmedEmail === '') {
      setEmailFieldError('Informe seu e-mail.')
      setPasswordFieldError(null)
      emailRef.current?.focus()
      return
    }

    if (!EMAIL_FORMAT.test(trimmedEmail)) {
      setEmailFieldError('Informe um e-mail válido.')
      setPasswordFieldError(null)
      emailRef.current?.focus()
      return
    }

    if (password === '') {
      setEmailFieldError(null)
      setPasswordFieldError('Informe sua senha.')
      passwordRef.current?.focus()
      return
    }

    setEmailFieldError(null)
    setPasswordFieldError(null)
    login(trimmedEmail, password)
  }

  return (
    <div className="fh-login-page">
      <div className="fh-login-page__visual" aria-hidden="true">
        <div className="fh-login-page__glow" />
        <img src={housemanagerLogo} alt="" className="fh-login-page__logo" />
        <p className="fh-login-page__tagline">Organize as finanças da sua casa com clareza e tranquilidade.</p>
      </div>

      <div className="fh-login-page__panel">
        <div className="fh-login-page__card fh-card fh-card--elevated">
          <h1>Entrar no HouseManager</h1>
          <p className="fh-login-page__description fh-text-secondary">Acesse sua conta para acompanhar as finanças da sua casa.</p>

          <form className="fh-login-page__form" onSubmit={handleSubmit} noValidate>
            <div className="fh-login-page__field">
              <label htmlFor={emailId}>E-mail</label>
              <input
                ref={emailRef}
                id={emailId}
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                aria-invalid={emailFieldError ? true : undefined}
                aria-describedby={emailFieldError ? emailErrorId : undefined}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (emailFieldError) setEmailFieldError(null)
                  if (loginError) clearLoginError()
                }}
              />
              {emailFieldError && (
                <p className="fh-login-page__field-error" id={emailErrorId} role="alert">
                  {emailFieldError}
                </p>
              )}
            </div>

            <div className="fh-login-page__field">
              <label htmlFor={passwordId}>Senha</label>
              <div className="fh-login-page__password-wrapper">
                <input
                  ref={passwordRef}
                  id={passwordId}
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  aria-invalid={passwordFieldError ? true : undefined}
                  aria-describedby={passwordFieldError ? passwordErrorId : undefined}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (passwordFieldError) setPasswordFieldError(null)
                    if (loginError) clearLoginError()
                  }}
                />
                <button
                  type="button"
                  className="fh-login-page__toggle-visibility"
                  aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  <EyeIcon crossed={!passwordVisible} />
                </button>
              </div>
              {passwordFieldError && (
                <p className="fh-login-page__field-error" id={passwordErrorId} role="alert">
                  {passwordFieldError}
                </p>
              )}
            </div>

            {loginError && (
              <p className="fh-login-page__error" id={formErrorId} role="alert">
                {loginError}
              </p>
            )}

            <button type="submit" className="fh-login-page__submit" disabled={pendingLogin} aria-busy={pendingLogin}>
              {pendingLogin ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="fh-login-page__note fh-text-muted">Acesso exclusivo aos membros cadastrados da residência.</p>
        </div>
      </div>
    </div>
  )
}
