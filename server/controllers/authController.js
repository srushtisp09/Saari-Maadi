import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function userResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    points: user.points,
    createdAt: user.createdAt,
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body ?? {}
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' })
    }
    if (
      typeof email !== 'string' ||
      email.length > 254 ||
      !EMAIL_PATTERN.test(email.trim())
    ) {
      return res.status(400).json({ message: 'Enter a valid email address.' })
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: 'Password must be between 8 and 72 characters.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.exists({ email: normalizedEmail })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const user = await User.create({ name: name.trim(), email: normalizedEmail, password })
    return res.status(201).json({ token: createToken(user), user: userResponse(user) })
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
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' })
    }
    if (typeof password !== 'string' || password.length === 0 || password.length > 72) {
      return res.status(400).json({ message: 'Enter your password.' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' })
    }

    return res.json({ token: createToken(user), user: userResponse(user) })
  } catch (error) {
    return next(error)
  }
}

export function currentUser(req, res) {
  return res.json({ user: userResponse(req.user) })
}
