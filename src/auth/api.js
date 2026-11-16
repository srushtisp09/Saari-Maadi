export const TOKEN_KEY = 'sari-maadi-auth-token'

let tokenListener = () => {}
let refreshInFlight
let slowRequestCount = 0

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || ''

function requestUrl(input) {
  const url = typeof input === 'string' ? input : input.url
  if (/^https?:\/\//i.test(url) || !API_BASE_URL) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function notifySlowRequests(active) {
  window.dispatchEvent(new CustomEvent('api-slow-request', { detail: { active } }))
}

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch (error) {
    console.warn('Could not update the login token in localStorage.', error)
  }
  tokenListener(token)
}

export function setTokenListener(listener) {
  tokenListener = listener
}

function authorizationToken(headers) {
  const value = headers.get('Authorization') || ''
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(requestUrl('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || typeof data.token !== 'string') {
          if (response.status === 401) writeToken(null)
          return null
        }
        writeToken(data.token)
        return data.token
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = undefined
      })
  }
  return refreshInFlight
}

function canRefresh(input) {
  const url = typeof input === 'string' ? input : input.url
  return !/\/api\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(url)
}

async function send(input, init, token) {
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  else headers.delete('Authorization')
  return fetch(input, { ...init, headers, credentials: 'include' })
}

export async function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers)
  const token = readToken() || authorizationToken(headers)
  const url = requestUrl(input)
  let slow = false
  const timer = window.setTimeout(() => {
    slow = true
    slowRequestCount += 1
    if (slowRequestCount === 1) notifySlowRequests(true)
  }, 1500)

  try {
    const response = await send(url, init, token)
    if (response.status !== 401 || !token || !canRefresh(url)) return response

    const refreshedToken = await refreshAccessToken()
    if (!refreshedToken) return response
    return await send(url, init, refreshedToken)
  } finally {
    window.clearTimeout(timer)
    if (slow) {
      slowRequestCount -= 1
      if (slowRequestCount === 0) notifySlowRequests(false)
    }
  }
}
