import { Router } from 'express'
import {
  createReport,
  changeReportStatus,
  getReport,
  listReports,
  nearbyReports,
  removeUpvote,
  upvoteReport,
} from '../controllers/potholeController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'
import { optionalAuth } from '../middleware/optionalAuth.js'
import { handlePhotoUpload } from '../middleware/upload.js'
import { reportLimiter, upvoteLimiter } from '../middleware/rateLimits.js'
import { sanitizeRequest } from '../middleware/sanitizeRequest.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  emptyBody,
  nearbyQuery,
  reportBody,
  reportIdParams,
  reportListQuery,
  statusBody,
} from '../validation/schemas.js'

const router = Router()

router.post(
  '/',
  requireAuth,
  reportLimiter,
  handlePhotoUpload,
  sanitizeRequest,
  validateRequest(reportBody),
  createReport,
)
router.get('/', validateRequest(reportListQuery, 'query'), optionalAuth, listReports)
router.get('/nearby', validateRequest(nearbyQuery, 'query'), nearbyReports)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('authority', 'admin'),
  validateRequest(reportIdParams, 'params'),
  validateRequest(statusBody),
  changeReportStatus,
)
router.post(
  '/:id/upvote',
  requireAuth,
  upvoteLimiter,
  validateRequest(reportIdParams, 'params'),
  validateRequest(emptyBody),
  upvoteReport,
)
router.delete('/:id/upvote', requireAuth, upvoteLimiter, validateRequest(reportIdParams, 'params'), removeUpvote)
router.get('/:id', validateRequest(reportIdParams, 'params'), optionalAuth, getReport)

export default router
