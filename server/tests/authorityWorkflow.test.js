import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import { awardBadgesForUser } from '../services/badges.js'
import { awardPoints } from '../services/points.js'

process.env.JWT_SECRET = 'phase-2b-test-secret-with-enough-length'

let mongoServer
let app
let User
let Pothole
let Notification
let citizen
let authority
let reporter

async function createUser(role, name) {
  return User.create({
    name,
    email: `${role}-${randomUUID()}@example.test`,
    password: 'TestPassword-123!',
    role,
  })
}

async function createReport(overrides = {}) {
  return Pothole.create({
    reportedBy: reporter._id,
    photoUrl: '/uploads/test.png',
    location: { type: 'Point', coordinates: [77.6, 12.9] },
    ai: { checked: true, isPothole: true, severity: 4, confidence: 0.9 },
    ...overrides,
  })
}

function authHeader(user) {
  return `Bearer ${jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' })}`
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { version: '8.2.6' } })
  await mongoose.connect(mongoServer.getUri())
  ;({ default: app } = await import('../app.js'))
  ;({ default: User } = await import('../models/User.js'))
  ;({ default: Pothole } = await import('../models/Pothole.js'))
  ;({ default: Notification } = await import('../models/Notification.js'))
  citizen = await createUser('citizen', 'Test Citizen')
  authority = await createUser('authority', 'Test Authority')
  reporter = await createUser('citizen', 'Test Reporter')
}, 60_000)

afterEach(async () => {
  if (!Pothole || !Notification) return
  await Promise.all([
    Pothole.deleteMany({}),
    Notification.deleteMany({}),
  ])
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongoServer) await mongoServer.stop()
})

test('rejects invalid status transitions with 400', async () => {
  const report = await createReport({ status: 'reported' })
  const response = await request(app)
    .patch(`/api/potholes/${report.id}/status`)
    .set('Authorization', authHeader(authority))
    .send({ status: 'fixed', note: 'Completed repair' })

  expect(response.status).toBe(400)
  expect(response.body.message).toMatch(/cannot move from "reported" to "fixed"/)
  const unchanged = await Pothole.findById(report._id)
  expect(unchanged.status).toBe('reported')
  expect(unchanged.statusHistory).toHaveLength(0)
})

test('blocks citizens from authority status routes', async () => {
  const report = await createReport({ status: 'reported' })
  const response = await request(app)
    .patch(`/api/potholes/${report.id}/status`)
    .set('Authorization', authHeader(citizen))
    .send({ status: 'verified' })

  expect(response.status).toBe(403)
  expect((await Pothole.findById(report._id)).status).toBe('reported')
})

test('awards the fixed bonus once and creates a status notification', async () => {
  const report = await createReport({ status: 'in_progress' })
  const firstResponse = await request(app)
    .patch(`/api/potholes/${report.id}/status`)
    .set('Authorization', authHeader(authority))
    .send({ status: 'fixed', note: 'Pothole repaired and road reopened.' })

  expect(firstResponse.status).toBe(200)
  expect(firstResponse.body.bonusPointsAwarded).toBe(20)
  expect(firstResponse.body.report.statusHistory).toHaveLength(1)
  expect(firstResponse.body.report.fixedAt).toBeTruthy()
  expect((await User.findById(reporter._id)).points).toBe(20)

  const retryResponse = await request(app)
    .patch(`/api/potholes/${report.id}/status`)
    .set('Authorization', authHeader(authority))
    .send({ status: 'fixed', note: 'Retry' })

  expect(retryResponse.status).toBe(400)
  expect((await User.findById(reporter._id)).points).toBe(20)
  expect(await Notification.countDocuments({
    user: reporter._id,
    type: 'status_changed',
    reportId: report._id,
  })).toBe(1)
})

test('notifies the reporter when the report reaches an upvote milestone', async () => {
  const report = await createReport({ status: 'reported' })
  const voters = await Promise.all(
    Array.from({ length: 5 }, (_, index) => createUser('citizen', `Milestone Voter ${index + 1}`)),
  )

  for (const voter of voters) {
    const response = await request(app)
      .post(`/api/potholes/${report.id}/upvote`)
      .set('Authorization', authHeader(voter))
    expect(response.status).toBe(200)
  }

  expect(await Notification.countDocuments({
    user: reporter._id,
    type: 'upvote_milestone',
    reportId: report._id,
  })).toBe(1)
  expect((await Pothole.findById(report._id)).upvoteCount).toBe(5)
}, 30_000)

test('awards every eligible badge once and records weekly points idempotently', async () => {
  const contributor = await createUser('citizen', 'Badge Contributor')
  const now = new Date()
  await Promise.all(Array.from({ length: 5 }, (_, index) => createReport({
    reportedBy: contributor._id,
    status: index < 3 ? 'fixed' : 'reported',
    fixedAt: index < 3 ? now : null,
    upvoteCount: 10,
  })))

  await Promise.all([
    awardBadgesForUser(contributor._id),
    awardBadgesForUser(contributor._id),
  ])
  const firstAward = await awardPoints({
    userId: contributor._id,
    amount: 7,
    reason: 'test_award',
    eventKey: 'test:weekly-points-once',
  })
  const repeatedAward = await awardPoints({
    userId: contributor._id,
    amount: 7,
    reason: 'test_award',
    eventKey: 'test:weekly-points-once',
  })

  const savedUser = await User.findById(contributor._id).select('+pointsHistory')
  expect(savedUser.badges.sort()).toEqual([
    'community-voice',
    'first-report',
    'good-samaritan',
    'problem-solver',
  ])
  expect(savedUser.points).toBe(7)
  expect(savedUser.pointsHistory).toHaveLength(1)
  expect(firstAward).toBe(true)
  expect(repeatedAward).toBe(false)
})

test('returns weekly and all-time ranks for the signed-in citizen', async () => {
  const contributor = await createUser('citizen', 'Ranked Contributor')
  await awardPoints({
    userId: contributor._id,
    amount: 12,
    reason: 'test_award',
    eventKey: 'test:ranked-contributor',
  })

  for (const period of ['weekly', 'all-time']) {
    const response = await request(app)
      .get(`/api/leaderboard?period=${period}`)
      .set('Authorization', authHeader(contributor))

    expect(response.status).toBe(200)
    expect(response.body.currentUserRank).toBeGreaterThan(0)
    expect(response.body.currentUser).toMatchObject({
      id: contributor.id,
      name: contributor.name,
      points: 12,
    })
  }
})

test('returns profile badges, rank, and the citizen report list', async () => {
  const profileUser = await createUser('citizen', 'Profile Citizen')
  const report = await createReport({ reportedBy: profileUser._id })
  await awardBadgesForUser(profileUser._id)

  const response = await request(app)
    .get('/api/profile')
    .set('Authorization', authHeader(profileUser))

  expect(response.status).toBe(200)
  expect(response.body.user.name).toBe(profileUser.name)
  expect(response.body.user.rank).toBeGreaterThan(0)
  expect(response.body.user.badges.map((badge) => badge.key)).toContain('first-report')
  expect(response.body.reports.map((item) => item.id)).toEqual([report.id])
})

test('serves a public city report card from non-seeded reports', async () => {
  await createReport({
    address: 'Public Test Area',
    status: 'reported',
  })
  await createReport({
    address: 'Seeded Public Test Area',
    status: 'fixed',
    seeded: true,
  })

  const response = await request(app).get('/api/city-report')

  expect(response.status).toBe(200)
  expect(response.body.totalReported).toBe(1)
  expect(response.body.worstAreas).toEqual([
    { area: 'Public Test Area', openReports: 1 },
  ])
  expect(response.body.topContributors[0]).toMatchObject({
    name: reporter.name,
    reports: 1,
  })
})

test('aggregates analytics from real reports and excludes seeded reports', async () => {
  const now = new Date()
  const realOpenReport = await createReport({
    address: 'Test Analytics Area',
    createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    status: 'reported',
    ai: { checked: true, isPothole: true, severity: 4, confidence: 0.9 },
  })
  const realFixedReport = await createReport({
    address: 'Test Analytics Area',
    createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    fixedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    status: 'fixed',
    ai: { checked: true, isPothole: true, severity: 3, confidence: 0.9 },
  })
  await createReport({
    address: 'Seeded Test Area',
    status: 'fixed',
    createdAt: now,
    fixedAt: now,
    seeded: true,
  })

  const blockedResponse = await request(app)
    .get('/api/analytics')
    .set('Authorization', authHeader(citizen))
  expect(blockedResponse.status).toBe(403)

  const response = await request(app)
    .get('/api/analytics')
    .set('Authorization', authHeader(authority))

  expect(response.status).toBe(200)
  expect(response.body.reportsByStatus).toEqual(expect.arrayContaining([
    { _id: 'reported', count: 1 },
    { _id: 'fixed', count: 1 },
  ]))
  expect(response.body.averageDaysToFixBySeverity).toContainEqual(
    expect.objectContaining({ severity: 3, averageDays: 2 }),
  )
  expect(response.body.sla).toMatchObject({ openReports: 1, breachedReports: 1 })
  expect(response.body.reports.map((report) => report.id)).toEqual(
    expect.arrayContaining([realOpenReport.id, realFixedReport.id]),
  )
  expect(response.body.reports).toHaveLength(2)
})
