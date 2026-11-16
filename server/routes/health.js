import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        message: 'Database is not connected.',
        status: 'error',
        database: 'disconnected',
      })
    }

    await mongoose.connection.db.admin().ping()
    return res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    return next(error)
  }
})

export default router
