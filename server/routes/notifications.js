import { Router } from 'express'
import {
  listNotifications,
  markAllNotificationsRead,
} from '../controllers/notificationController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { notificationsQuery } from '../validation/schemas.js'

const router = Router()

router.use(requireAuth)
router.get('/', validateRequest(notificationsQuery, 'query'), listNotifications)
router.patch('/read-all', markAllNotificationsRead)

export default router
