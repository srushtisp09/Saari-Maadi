import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

export default function RoleRoute({ roles, children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <main className="map-loading-screen">Checking your access…</main>
  }
  if (!roles.includes(user?.role)) return <Navigate to="/home" replace />
  return children
}
