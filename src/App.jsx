import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import Home from './components/Home.jsx'
import Landing from './components/Landing.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ReportPothole from './pages/ReportPothole.jsx'
import AuthPage from './pages/AuthPage.jsx'

const INTRO_KEY = 'sari-maadi-intro-seen'

function shouldPlayIntro() {
  if (typeof window === 'undefined') return false

  const prefersReducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  if (prefersReducedMotion) return false

  try {
    return window.localStorage.getItem(INTRO_KEY) !== 'true'
  } catch (error) {
    console.warn('Could not read the intro preference from localStorage.', error)
    return true
  }
}

function rememberIntro() {
  try {
    window.localStorage.setItem(INTRO_KEY, 'true')
  } catch (error) {
    console.warn('Could not save the intro preference to localStorage.', error)
  }
}

function Introduction() {
  const [showIntro, setShowIntro] = useState(shouldPlayIntro)

  function finishIntro() {
    rememberIntro()
    setShowIntro(false)
  }

  return showIntro ? (
    <Landing onComplete={finishIntro} onSkip={finishIntro} />
  ) : (
    <Home />
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Introduction />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportPothole />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
