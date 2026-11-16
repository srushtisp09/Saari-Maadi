import { createHmac } from 'node:crypto'
import jwt from 'jsonwebtoken'

export const REFRESH_COOKIE = 'sari_maadi_refresh'
export const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '7d'
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function refreshSecret() {
  return process.env.JWT_REFRESH_SECRET ||
    createHmac('sha256', process.env.JWT_SECRET)
      .update('sari-maadi-refresh-token-v1')
      .digest('hex')
}

export function createAccessToken(user) {
  return jwt.sign(
    { sub: user.id, typ: 'access', ver: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  )
}

export function setRefreshCookie(res, user) {
  const token = jwt.sign(
    { sub: user.id, typ: 'refresh', ver: user.tokenVersion ?? 0 },
    refreshSecret(),
    { expiresIn: REFRESH_TOKEN_TTL },
  )
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  })
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    path: '/api/auth',
  })
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret())
}
