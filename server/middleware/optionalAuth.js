import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export async function optionalAuth(req, res, next) {
  const authorization = req.get('authorization')
  if (!authorization && req.query.mine !== 'true') return next()

  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) {
    return res.status(401).json({
      message: req.query.mine === 'true'
        ? 'Sign in to view your reports.'
        : 'A valid Bearer token is required.',
    })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ message: 'This account no longer exists.' })
    req.user = user
    return next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Your login has expired. Please sign in again.' })
    }
    return next(error)
  }
}
