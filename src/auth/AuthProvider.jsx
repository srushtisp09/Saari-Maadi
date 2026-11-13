import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './context.js'

const TOKEN_KEY = 'sari-maadi-auth-token'

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch (error) {
    console.warn('Could not read the login token from localStorage.', error)
    return null
  }
}

function saveToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch (error) {
    console.warn('Could not update the login token in localStorage.', error)
  }
}

async function request(path, { token, ...options } = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.')
  return data
}

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(readToken()))

  useEffect(() => {
    if (!token) return undefined

    let active = true
    request('/api/auth/me', { token })
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser)
      })
      .catch((error) => {
        if (!active) return
        console.warn('Could not restore the saved login:', error.message)
        saveToken(null)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const authenticate = useCallback(async (endpoint, credentials) => {
    const data = await request(`/api/auth/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    saveToken(data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(
    (credentials) => authenticate('login', credentials),
    [authenticate],
  )
  const register = useCallback(
    (credentials) => authenticate('register', credentials),
    [authenticate],
  )
  const logout = useCallback(() => {
    saveToken(null)
    setToken(null)
    setUser(null)
    setIsLoading(false)
  }, [])

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
