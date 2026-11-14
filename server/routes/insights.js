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

const router = Router()

router.get('/leaderboard', optionalAuth, getLeaderboardPage)
router.get('/city-report', getCityReport)
router.get('/analytics', requireAuth, requireRole('authority', 'admin'), getAnalytics)
router.get('/profile', requireAuth, getProfile)

export default router
