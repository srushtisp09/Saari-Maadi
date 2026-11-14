import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import Home from './components/Home.jsx'
import Landing from './components/Landing.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import ReportPothole from './pages/ReportPothole.jsx'
import AuthPage from './pages/AuthPage.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { ToastProvider } from './toast/ToastProvider.jsx'

const MapPage = lazy(() => import('./pages/MapPage.jsx'))
const PotholeDetail = lazy(() => import('./pages/PotholeDetail.jsx'))
const AuthorityDashboard = lazy(() => import('./pages/AuthorityDashboard.jsx'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard.jsx'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const CityReportPage = lazy(() => import('./pages/CityReportPage.jsx'))

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
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <ThemeToggle />
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
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<main className="map-loading-screen">Loading profile…</main>}>
                      <ProfilePage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <RoleRoute roles={['authority', 'admin']}>
                      <Suspense fallback={<main className="map-loading-screen">Loading analytics…</main>}>
                        <AnalyticsDashboard />
                      </Suspense>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority"
                element={
                  <ProtectedRoute>
                    <RoleRoute roles={['authority', 'admin']}>
                      <Suspense fallback={<main className="map-loading-screen">Loading authority queue…</main>}>
                        <AuthorityDashboard />
                      </Suspense>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <Suspense fallback={<main className="map-loading-screen">Loading leaderboard…</main>}>
                    <LeaderboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/city-report"
                element={
                  <Suspense fallback={<main className="map-loading-screen">Loading city report…</main>}>
                    <CityReportPage />
                  </Suspense>
                }
              />
              <Route
                path="/map"
                element={
                  <Suspense fallback={<main className="map-loading-screen">Loading map…</main>}>
                    <MapPage />
                  </Suspense>
                }
              />
              <Route
                path="/potholes/:id"
                element={
                  <Suspense fallback={<main className="map-loading-screen">Loading report…</main>}>
                    <PotholeDetail />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
