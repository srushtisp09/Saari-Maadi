import { Router } from 'express'
import { currentUser, login, logout, refresh, register } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { loginLimiter, refreshLimiter, registerLimiter } from '../middleware/rateLimits.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { loginBody, registerBody } from '../validation/schemas.js'

const router = Router()

router.post('/register', registerLimiter, validateRequest(registerBody), register)
router.post('/login', loginLimiter, validateRequest(loginBody), login)
router.post('/refresh', refreshLimiter, refresh)
router.post('/logout', requireAuth, logout)
router.get('/me', requireAuth, currentUser)

export default router
