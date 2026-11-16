import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000

function createLimiter(limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
  })
}

export const apiLimiter = createLimiter(300, 'Too many requests. Please try again later.')
export const loginLimiter = createLimiter(5, 'Too many login attempts. Please wait before trying again.')
export const refreshLimiter = createLimiter(30, 'Too many session refreshes. Please sign in again later.')
export const registerLimiter = createLimiter(5, 'Too many registration attempts. Please try again later.')
export const reportLimiter = createLimiter(10, 'Too many reports submitted. Please try again later.')
export const upvoteLimiter = createLimiter(30, 'Too many upvote changes. Please try again later.')

const limiters = [apiLimiter, loginLimiter, refreshLimiter, registerLimiter, reportLimiter, upvoteLimiter]

export async function resetRateLimitBuckets(ip) {
  const key = ipKeyGenerator(ip)
  await Promise.all(limiters.map((limiter) => limiter.resetKey(key)))
}
