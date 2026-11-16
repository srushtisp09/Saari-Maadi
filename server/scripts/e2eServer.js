import '../config/loadEnv.js'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { validateEnvironment } from '../config/env.js'

const { port } = validateEnvironment()
const e2eUploads = path.resolve('server/.e2e-uploads')
await rm(e2eUploads, { recursive: true, force: true })
const mongoServer = await MongoMemoryServer.create({ binary: { version: '8.2.6' } })
await mongoose.connect(mongoServer.getUri())

const { default: User } = await import('../models/User.js')
const { default: Pothole } = await import('../models/Pothole.js')
const { default: app } = await import('../app.js')

const reporter = await User.create({
  name: 'E2E Reporter',
  email: 'e2e-reporter@example.test',
  password: 'E2EReporterPass123',
})
await User.create({
  name: 'E2E Authority',
  email: 'e2e-authority@example.test',
  password: 'E2EAuthorityPass123',
  role: 'authority',
})

for (const description of ['E2E upvote target', 'E2E status target']) {
  await Pothole.create({
    reportedBy: reporter._id,
    photoUrl: '/uploads/e2e-placeholder.png',
    description,
    location: { type: 'Point', coordinates: [77.4, 12.8] },
    status: 'reported',
    ai: { checked: true, isPothole: true, severity: 3, confidence: 0.9 },
  })
}

const server = app.listen(port, '127.0.0.1', () => {
  console.info(`E2E API listening on http://127.0.0.1:${port}`)
})

async function shutdown() {
  server.close(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
    await rm(e2eUploads, { recursive: true, force: true })
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
