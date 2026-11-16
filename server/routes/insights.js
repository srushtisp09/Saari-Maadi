import { Router } from 'express'
import {
  getAnalytics,
  getCityReport,
  getLeaderboardPage,
  getProfile,
} from '../controllers/insightsController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'
import { optionalAuth } from '../middleware/optionalAuth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { analyticsQuery, leaderboardQuery, profileQuery } from '../validation/schemas.js'

const router = Router()

router.get('/leaderboard', validateRequest(leaderboardQuery, 'query'), optionalAuth, getLeaderboardPage)
router.get('/city-report', getCityReport)
router.get(
  '/analytics',
  requireAuth,
  requireRole('authority', 'admin'),
  validateRequest(analyticsQuery, 'query'),
  getAnalytics,
)
router.get('/profile', requireAuth, validateRequest(profileQuery, 'query'), getProfile)

export default router
