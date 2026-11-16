import User from '../models/User.js'
import { getBadgeDetails } from '../config/badges.js'
import {
  clearRefreshCookie,
  createAccessToken,
  REFRESH_COOKIE,
  setRefreshCookie,
  verifyRefreshToken,
} from '../services/authTokens.js'
import jwt from 'jsonwebtoken'

function userResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    points: user.points,
    badges: getBadgeDetails(user.badges || []),
    createdAt: user.createdAt,
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body ?? {}
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.exists({ email: normalizedEmail })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const user = await User.create({ name: name.trim(), email: normalizedEmail, password })
    setRefreshCookie(res, user)
    return res.status(201).json({ token: createAccessToken(user), user: userResponse(user) })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    return next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {}
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' })
    }

    setRefreshCookie(res, user)
    return res.json({ token: createAccessToken(user), user: userResponse(user) })
  } catch (error) {
    return next(error)
  }
}

export function currentUser(req, res) {
  return res.json({ user: userResponse(req.user) })
}

export async function refresh(req, res, next) {
  const token = req.cookies?.[REFRESH_COOKIE]
  if (!token) return res.status(401).json({ message: 'Your refresh session has expired. Please sign in again.' })

  try {
    const payload = verifyRefreshToken(token)
    if (payload.typ !== 'refresh' || !Number.isInteger(payload.ver)) {
      return res.status(401).json({ message: 'Your refresh session is invalid. Please sign in again.' })
    }

    const user = await User.findOneAndUpdate(
      { _id: payload.sub, tokenVersion: payload.ver },
      { $inc: { tokenVersion: 1 } },
      { returnDocument: 'after' },
    ).select('+tokenVersion')
    if (!user) {
      clearRefreshCookie(res)
      return res.status(401).json({ message: 'Your refresh session has expired. Please sign in again.' })
    }

    setRefreshCookie(res, user)
    return res.json({ token: createAccessToken(user) })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      clearRefreshCookie(res)
      return res.status(401).json({ message: 'Your refresh session has expired. Please sign in again.' })
    }
    return next(error)
  }
}

export async function logout(req, res, next) {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } })
    clearRefreshCookie(res)
    return res.json({ message: 'You have been signed out.' })
  } catch (error) {
    return next(error)
  }
}
