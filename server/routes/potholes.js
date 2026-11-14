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

const router = Router()

router.post('/', requireAuth, handlePhotoUpload, createReport)
router.get('/', optionalAuth, listReports)
router.get('/nearby', nearbyReports)
router.patch('/:id/status', requireAuth, requireRole('authority', 'admin'), changeReportStatus)
router.post('/:id/upvote', requireAuth, upvoteReport)
router.delete('/:id/upvote', requireAuth, removeUpvote)
router.get('/:id', optionalAuth, getReport)

export default router
