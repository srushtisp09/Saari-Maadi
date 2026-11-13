import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

const copy = {
  en: {
    loginTitle: 'Welcome back',
    registerTitle: 'Join the ride',
    loginDescription: 'Sign in to keep Bengaluru moving smoothly.',
    registerDescription: 'Create an account and help make every ride better.',
    name: 'Your name',
    email: 'Email address',
    password: 'Password',
    login: 'Log in',
    register: 'Create account',
    noAccount: 'New to Sari Maadi?',
    hasAccount: 'Already riding with us?',
    loginLink: 'Log in',
    registerLink: 'Create an account',
    switchToKannada: 'ಕನ್ನಡ',
    switchToEnglish: 'English',
    genericError: 'We could not complete your request. Please try again.',
  },
  kn: {
    loginTitle: 'ಮರಳಿ ಸ್ವಾಗತ',
    registerTitle: 'ನಮ್ಮ ಜೊತೆ ಸೇರಿ',
    loginDescription: 'ಬೆಂಗಳೂರು ರಸ್ತೆಗಳ ಪ್ರಯಾಣ ಸುಗಮವಾಗಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.',
    registerDescription: 'ಖಾತೆ ತೆರೆಯಿರಿ, ಪ್ರತಿಯೊಂದು ಪ್ರಯಾಣವನ್ನೂ ಉತ್ತಮಗೊಳಿಸಿ.',
    name: 'ನಿಮ್ಮ ಹೆಸರು',
    email: 'ಇಮೇಲ್ ವಿಳಾಸ',
    password: 'ಪಾಸ್‌ವರ್ಡ್',
    login: 'ಲಾಗಿನ್',
    register: 'ಖಾತೆ ತೆರೆಯಿರಿ',
    noAccount: 'ಸರಿ ಮಾಡಿ ಹೊಸಬರೇ?',
    hasAccount: 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?',
    loginLink: 'ಲಾಗಿನ್',
    registerLink: 'ಖಾತೆ ತೆರೆಯಿರಿ',
    switchToKannada: 'ಕನ್ನಡ',
    switchToEnglish: 'English',
    genericError: 'ವಿನಂತಿ ಪೂರ್ಣಗೊಳ್ಳಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  },
}

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const [language, setLanguage] = useState('en')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const text = copy[language]

  if (user) return <Navigate to="/home" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await (isRegister
        ? register({ name, email, password })
        : login({ email, password }))
      const destination = location.state?.from?.pathname || '/home'
      navigate(destination, { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.genericError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-screen relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-12">
      <div aria-hidden="true" className="auth-decoration auth-decoration-one" />
      <div aria-hidden="true" className="auth-decoration auth-decoration-two" />
      <section className="auth-card relative z-10 w-full max-w-md rounded-[2rem] border border-[#1b5e3a]/10 bg-white/90 p-7 shadow-[0_24px_70px_rgba(47,45,33,.12)] backdrop-blur sm:p-10">
        <div className="mb-7 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <span className="brand-mark" aria-hidden="true">ಸ</span>
            <span className="font-baloo text-xl font-extrabold text-[#1b5e3a]">Sari Maadi</span>
          </Link>
          <div className="flex rounded-full bg-[#fff8e7] p-1" aria-label="Language">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
              className={`language-button ${language === 'en' ? 'is-selected' : ''}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('kn')}
              aria-pressed={language === 'kn'}
              className={`language-button font-kannada ${language === 'kn' ? 'is-selected' : ''}`}
            >
              ಕನ್ನಡ
            </button>
          </div>
        </div>

        <p className="mb-2 font-kannada text-sm font-bold text-[#c1272d]">ಸರಿ ಮಾಡಿ</p>
        <h1 className="font-baloo text-4xl font-extrabold leading-tight text-[#1b5e3a]">
          {isRegister ? text.registerTitle : text.loginTitle}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#625d4f]">
          {isRegister ? text.registerDescription : text.loginDescription}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="auth-label">
              <span>{text.name}</span>
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={text.name}
              />
            </label>
          )}
          <label className="auth-label">
            <span>{text.email}</span>
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="auth-label">
            <span>{text.password}</span>
            <input
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={isRegister ? 8 : undefined}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
            {isRegister && (
              <span className="auth-hint">Use at least 8 characters.</span>
            )}
          </label>

          {errorMessage && (
            <p className="auth-error" role="alert">{errorMessage}</p>
          )}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting
              ? '…'
              : isRegister
                ? text.register
                : text.login}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-[#625d4f]">
          {isRegister ? text.hasAccount : text.noAccount}{' '}
          <Link
            className="font-bold text-[#c1272d] underline decoration-[#c1272d]/30 underline-offset-4 hover:decoration-[#c1272d]"
            to={isRegister ? '/login' : '/register'}
          >
            {isRegister ? text.loginLink : text.registerLink}
          </Link>
        </p>
      </section>
    </main>
  )
}
