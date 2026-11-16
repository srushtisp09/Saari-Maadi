import '../config/loadEnv.js'
import mongoose from 'mongoose'
import { connectDatabase, stopDatabase } from '../config/database.js'
import { seedDemoData } from '../services/demoSeed.js'

if (process.env.DEMO_MODE?.trim().toLowerCase() !== 'true') {
  throw new Error('Set DEMO_MODE=true and provide both demo passwords before seeding.')
}

try {
  await connectDatabase()
  await seedDemoData()
} finally {
  if (mongoose.connection.readyState) await stopDatabase()
}
