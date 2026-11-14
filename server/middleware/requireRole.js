export function requireRole(...roles) {
  if (!roles.length || roles.some((role) => !['citizen', 'authority', 'admin'].includes(role))) {
    throw new Error('requireRole must be configured with valid user roles.')
  }

  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'A valid login is required.' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' })
    }
    return next()
  }
}
