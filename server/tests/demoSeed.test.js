import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

const uploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.demo-test-uploads')
process.env.NODE_ENV = 'test'
process.env.UPLOADS_DIR = uploadsDirectory
process.env.DEMO_AUTHORITY_PASSWORD = 'AuthorityDemo-Test-123'
process.env.DEMO_CITIZEN_PASSWORD = 'CitizenDemo-Test-123'

let mongoServer
let User
let Pothole
let seedDemoData
let removeStoredPhotoUrl

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { version: '8.2.6' } })
  await mongoose.connect(mongoServer.getUri())
  ;({ default: User } = await import('../models/User.js'))
  ;({ default: Pothole } = await import('../models/Pothole.js'))
  ;({ seedDemoData } = await import('../services/demoSeed.js'))
  ;({ removeStoredPhotoUrl } = await import('../services/photoStorage.js'))
  await Promise.all([User.init(), Pothole.init()])
}, 60_000)

afterAll(async () => {
  const [sampleReport] = await Pothole.find({ seeded: true }).select('photoUrl').limit(1).lean()
  await Pothole.deleteMany({})
  await User.deleteMany({})
  await mongoose.disconnect()
  await mongoServer?.stop()
  if (sampleReport?.photoUrl) await removeStoredPhotoUrl(sampleReport.photoUrl)
  await rm(uploadsDirectory, { recursive: true, force: true })
}, 60_000)

test('only seeds demo data when enabled and creates it idempotently across report statuses', async () => {
  process.env.DEMO_MODE = 'false'
  await seedDemoData()
  expect(await Pothole.countDocuments()).toBe(0)
  expect(await User.countDocuments()).toBe(0)

  process.env.DEMO_MODE = 'true'
  await seedDemoData()
  await seedDemoData()

  const [authority, citizen] = await Promise.all([
    User.findOne({ role: 'authority' }).select('+password'),
    User.findOne({ role: 'citizen' }).select('+password'),
  ])
  expect(await User.countDocuments()).toBe(2)
  expect(await authority.comparePassword(process.env.DEMO_AUTHORITY_PASSWORD)).toBe(true)
  expect(await citizen.comparePassword(process.env.DEMO_CITIZEN_PASSWORD)).toBe(true)

  const reports = await Pothole.find({ seeded: true }).select('status').lean()
  expect(reports).toHaveLength(15)
  expect(new Set(reports.map((report) => report.status))).toEqual(new Set([
    'reported',
    'verified',
    'in_progress',
    'fixed',
    'rejected',
  ]))
}, 60_000)
