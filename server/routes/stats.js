import { Router } from 'express'
import { getStats } from '../controllers/potholeController.js'

const router = Router()

router.get('/', getStats)

export default router
