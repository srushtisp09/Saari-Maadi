import { Router } from 'express'
import {
  createReport,
  getReport,
  listReports,
} from '../controllers/potholeController.js'
import { requireAuth } from '../middleware/auth.js'
import { optionalAuth } from '../middleware/optionalAuth.js'
import { handlePhotoUpload } from '../middleware/upload.js'

const router = Router()

router.post('/', requireAuth, handlePhotoUpload, createReport)
router.get('/', optionalAuth, listReports)
router.get('/:id', getReport)

export default router
