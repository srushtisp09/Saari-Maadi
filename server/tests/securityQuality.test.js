import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import { resetRateLimitBuckets } from '../middleware/rateLimits.js'
import { clearRefreshCookie, setRefreshCookie } from '../services/authTokens.js'

process.env.JWT_SECRET = 'phase-2d-security-test-secret-with-more-than-32-characters'
process.env.NODE_ENV = 'test'
const uploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.test-uploads')
process.env.UPLOADS_DIR = uploadsDirectory

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/r2cAAAAASUVORK5CYII=', 'base64')
let mongoServer
let app
let User
let Pothole
let Notification
let citizen
let authority
let reporter

async function createUser(role = 'citizen', name = 'Security Test User') {
  return User.create({
    name,
    email: `${role}-${randomUUID()}@example.test`,
    password: 'SecurityTestPass123',
    role,
  })
}

async function createReport(overrides = {}) {
  if (!reporter) reporter = await createUser('citizen', 'Report Owner')
  return Pothole.create({
    reportedBy: reporter._id,
    photoUrl: '/uploads/unavailable-test-photo.png',
    location: { type: 'Point', coordinates: [77.4, 12.8] },
    ai: { checked: true, isPothole: true, severity: 3, confidence: 0.9 },
    ...overrides,
  })
}

function authHeader(user) {
  const token = jwt.sign(
    { sub: user.id, typ: 'access', ver: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  )
  return `Bearer ${token}`
}

function uploadPng(url = '/api/potholes') {
  return request(app)
    .post(url)
    .set('Authorization', authHeader(citizen))
    .field('lat', '12.8')
    .field('lng', '77.4')
    .attach('photo', png, { filename: 'road.png', contentType: 'image/png' })
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { version: '8.2.6' } })
  await mongoose.connect(mongoServer.getUri())
  ;({ default: app } = await import('../app.js'))
  ;({ default: User } = await import('../models/User.js'))
  ;({ default: Pothole } = await import('../models/Pothole.js'))
  ;({ default: Notification } = await import('../models/Notification.js'))
  await Promise.all([User.init(), Pothole.init(), Notification.init()])
}, 60_000)

beforeEach(() => {
  citizen = null
  authority = null
  reporter = null
})

afterEach(async () => {
  await Promise.all([
    Pothole.deleteMany({}),
    Notification.deleteMany({}),
    User.deleteMany({}),
    resetRateLimitBuckets('127.0.0.1'),
  ])
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer?.stop()
  await rm(uploadsDirectory, { recursive: true, force: true })
})

test('health endpoint confirms the database is reachable', async () => {
  const response = await request(app).get('/api/health')
  expect(response.status).toBe(200)
  expect(response.body).toEqual({ status: 'ok', database: 'connected' })
})

test('uses secure cross-origin refresh cookies in production', () => {
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  let cookieOptions
  let clearCookieOptions
  setRefreshCookie({
    cookie(_name, _token, options) {
      cookieOptions = options
    },
  }, { id: '000000000000000000000001', tokenVersion: 0 })
  clearRefreshCookie({
    clearCookie(_name, options) {
      clearCookieOptions = options
    },
  })
  process.env.NODE_ENV = originalNodeEnv

  expect(cookieOptions).toMatchObject({ httpOnly: true, secure: true, sameSite: 'none' })
  expect(clearCookieOptions).toMatchObject({ httpOnly: true, secure: true, sameSite: 'none' })
})

test('publishes the OpenAPI definition', async () => {
  const response = await request(app).get('/api/docs/openapi.json')
  expect(response.status).toBe(200)
  expect(response.body.openapi).toBe('3.0.3')
  expect(response.body.paths['/api/potholes/{id}/status']).toBeTruthy()
})

test('registers a sanitized citizen without returning a password hash', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: '<script>alert(1)</script>Asha Rao',
    email: 'asha-security@example.test',
    password: 'StrongPass123',
    role: 'admin',
  })
  expect(response.status).toBe(400)
  expect(response.body.error.code).toBe('BAD_REQUEST')
})

test('registers valid citizens with hashed passwords and no password response field', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: 'Asha Rao',
    email: 'asha-security@example.test',
    password: 'StrongPass123',
  })
  const savedUser = await User.findById(response.body.user.id).select('+password')
  expect(response.status).toBe(201)
  expect(response.body.user).not.toHaveProperty('password')
  expect(savedUser.password).toMatch(/^\$2/)
  expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/i)
})

test.each([
  [{}, 'name'],
  [{ name: 'Asha Rao', email: 'not-an-email', password: 'StrongPass123' }, 'email'],
  [{ name: 'A', email: 'asha@example.test', password: 'StrongPass123' }, 'name'],
  [{ name: 'Asha Rao', email: 'asha@example.test', password: 'short' }, 'password'],
  [{ name: 'Asha Rao', email: 'asha@example.test', password: 'StrongPass123', role: 'admin' }, 'Unrecognized key'],
  [{ name: 'Asha Rao', email: { $ne: '' }, password: 'StrongPass123' }, 'email'],
])('rejects invalid registration payload %j', async (body, expectedMessage) => {
  const response = await request(app).post('/api/auth/register').send(body)
  expect(response.status).toBe(400)
  expect(response.body.error.message).toMatch(new RegExp(expectedMessage, 'i'))
})

test.each([
  [{}, 400],
  [{ email: 'invalid', password: 'something' }, 400],
  [{ email: 'missing@example.test', password: 'NoSuchAccount123' }, 401],
])('validates login credentials %j', async (body, expectedStatus) => {
  const response = await request(app).post('/api/auth/login').send(body)
  expect(response.status).toBe(expectedStatus)
  expect(response.body).not.toHaveProperty('stack')
})

test('login never returns the password hash', async () => {
  const user = await createUser()
  const response = await request(app).post('/api/auth/login').send({
    email: user.email,
    password: 'SecurityTestPass123',
  })
  expect(response.status).toBe(200)
  expect(response.body.user).not.toHaveProperty('password')
})

test('issues a short-lived access token', async () => {
  const user = await createUser()
  const response = await request(app).post('/api/auth/login').send({
    email: user.email,
    password: 'SecurityTestPass123',
  })
  const token = jwt.decode(response.body.token)
  expect(token.exp - token.iat).toBeLessThanOrEqual(15 * 60)
  expect(token.typ).toBe('access')
})

test('rotates refresh cookies and allows the new access token', async () => {
  const user = await createUser()
  const agent = request.agent(app)
  const login = await agent.post('/api/auth/login').send({
    email: user.email,
    password: 'SecurityTestPass123',
  })
  const refresh = await agent.post('/api/auth/refresh')
  const currentUser = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${refresh.body.token}`)
  const staleCookie = login.headers['set-cookie'][0].split(';')[0]
  const staleRefresh = await request(app).post('/api/auth/refresh').set('Cookie', staleCookie)

  expect(refresh.status).toBe(200)
  expect(currentUser.status).toBe(200)
  expect(staleRefresh.status).toBe(401)
})

test('logout revokes the access and refresh session', async () => {
  const user = await createUser()
  const agent = request.agent(app)
  const login = await agent.post('/api/auth/login').send({
    email: user.email,
    password: 'SecurityTestPass123',
  })
  const logout = await agent.post('/api/auth/logout').set('Authorization', `Bearer ${login.body.token}`)
  const currentUser = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`)

  expect(logout.status).toBe(200)
  expect(currentUser.status).toBe(401)
  expect((await agent.post('/api/auth/refresh')).status).toBe(401)
})

test.each([
  [null, 401],
  ['Bearer invalid-token', 401],
  [`Bearer ${jwt.sign({ sub: '000000000000000000000001', typ: 'refresh', ver: 0 }, process.env.JWT_SECRET)}`, 401],
])('rejects invalid access credentials', async (header, expectedStatus) => {
  const call = request(app).get('/api/auth/me')
  if (header) call.set('Authorization', header)
  const response = await call
  expect(response.status).toBe(expectedStatus)
  expect(response.body.error).toBeTruthy()
})

test('rejects requests from origins outside the configured CORS allowlist', async () => {
  const response = await request(app).get('/api/health').set('Origin', 'https://attacker.example')
  expect(response.status).toBe(403)
  expect(response.body.error.message).toMatch(/CORS/i)
})

test('allows an origin in the development allowlist', async () => {
  const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173')
  expect(response.status).toBe(200)
  expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
})

test.each([
  ['status=unknown', 'status'],
  ['severity=6', 'severity'],
  ['page=0', 'page'],
  ['limit=201', 'limit'],
  ['unexpected=true', 'Unrecognized key'],
  ['status%5B%24ne%5D=fixed', 'status'],
])('validates pothole list query %s', async (query, expectedMessage) => {
  const response = await request(app).get(`/api/potholes?${query}`)
  expect(response.status).toBe(400)
  expect(response.body.error.message).toMatch(new RegExp(expectedMessage, 'i'))
})

test.each([
  ['', 'lat'],
  ['lat=bad&lng=77.4', 'lat'],
  ['lat=12.8&lng=181', 'lng'],
  ['lat=12.8&lng=77.4&radius=5001', 'radius'],
  ['lat=12.8&lng=77.4&page=0', 'page'],
])('validates nearby report query %s', async (query, expectedMessage) => {
  const response = await request(app).get(`/api/potholes/nearby?${query}`)
  expect(response.status).toBe(400)
  expect(response.body.error.message).toMatch(new RegExp(expectedMessage, 'i'))
})

test.each([
  ['/api/potholes/not-an-object-id', 'GET'],
  ['/api/potholes/not-an-object-id/upvote', 'POST'],
])('validates report ids for %s', async (url, method) => {
  if (method === 'GET') {
    const response = await request(app).get(url)
    expect(response.status).toBe(400)
    return
  }
  citizen = await createUser()
  const response = await request(app).post(url).set('Authorization', authHeader(citizen))
  expect(response.status).toBe(400)
})

test('requires a valid login to access protected report operations', async () => {
  const report = await createReport()
  const response = await request(app).post(`/api/potholes/${report.id}/upvote`)
  expect(response.status).toBe(401)
})

test('protects authority status changes from citizens', async () => {
  citizen = await createUser()
  const report = await createReport()
  const response = await request(app)
    .patch(`/api/potholes/${report.id}/status`)
    .set('Authorization', authHeader(citizen))
    .send({ status: 'verified' })
  expect(response.status).toBe(403)
})

test('rejects unknown status values before updating reports', async () => {
  authority = await createUser('authority')
  const report = await createReport()
  const response = await request(app)
    .patch(`/api/potholes/${report.id}/status`)
    .set('Authorization', authHeader(authority))
    .send({ status: 'teleported' })
  expect(response.status).toBe(400)
  expect((await Pothole.findById(report.id)).status).toBe('reported')
})

test('requires a note when rejecting a report', async () => {
  authority = await createUser('authority')
  const report = await createReport()
  const response = await request(app)
    .patch(`/api/potholes/${report.id}/status`)
    .set('Authorization', authHeader(authority))
    .send({ status: 'rejected' })
  expect(response.status).toBe(400)
  expect(response.body.error.message).toMatch(/note is required/i)
})

test('paginates the pothole list', async () => {
  await createReport({ description: 'First report' })
  await createReport({ description: 'Second report' })
  const response = await request(app).get('/api/potholes?limit=1&page=2')
  expect(response.status).toBe(200)
  expect(response.body.reports).toHaveLength(1)
  expect(response.body.pagination).toMatchObject({ total: 2, page: 2, limit: 1, pages: 2, hasMore: false })
})

test('paginates the authenticated profile reports', async () => {
  citizen = await createUser()
  await createReport({ reportedBy: citizen._id, description: 'Profile one' })
  await createReport({ reportedBy: citizen._id, description: 'Profile two' })
  const response = await request(app)
    .get('/api/profile?page=2&limit=1')
    .set('Authorization', authHeader(citizen))
  expect(response.status).toBe(200)
  expect(response.body.reports).toHaveLength(1)
  expect(response.body.pagination).toMatchObject({ total: 2, page: 2, limit: 1, pages: 2 })
})

test('paginates notifications and returns an unread count', async () => {
  citizen = await createUser()
  const report = await createReport()
  await Notification.insertMany([1, 2, 3].map((index) => ({
    user: citizen._id,
    type: 'status_changed',
    message: `Status changed ${index}`,
    reportId: report._id,
  })))
  const response = await request(app)
    .get('/api/notifications?page=2&limit=1')
    .set('Authorization', authHeader(citizen))
  expect(response.status).toBe(200)
  expect(response.body.notifications).toHaveLength(1)
  expect(response.body.unreadCount).toBe(3)
  expect(response.body.pagination.total).toBe(3)
})

test('validates multipart report coordinates and upload fields', async () => {
  citizen = await createUser()
  const invalidLocation = await request(app)
    .post('/api/potholes')
    .set('Authorization', authHeader(citizen))
    .field('lat', '91')
    .field('lng', '77.4')
    .attach('photo', png, { filename: 'road.png', contentType: 'image/png' })
  expect(invalidLocation.status).toBe(400)
  expect(invalidLocation.body.error.code).toBe('BAD_REQUEST')

  const unknownField = await uploadPng().field('role', 'admin')
  expect(unknownField.status).toBe(400)
})

test('rejects unsupported photo types and invalid image signatures', async () => {
  citizen = await createUser()
  const unsupported = await request(app)
    .post('/api/potholes')
    .set('Authorization', authHeader(citizen))
    .field('lat', '12.8')
    .field('lng', '77.4')
    .attach('photo', Buffer.from('not an image'), { filename: 'photo.svg', contentType: 'image/svg+xml' })
  const invalidSignature = await request(app)
    .post('/api/potholes')
    .set('Authorization', authHeader(citizen))
    .field('lat', '12.8')
    .field('lng', '77.4')
    .attach('photo', Buffer.from('not png'), { filename: 'photo.png', contentType: 'image/png' })
  expect(unsupported.status).toBe(400)
  expect(invalidSignature.status).toBe(400)
  expect(invalidSignature.body.error.message).toMatch(/contents do not match/i)
})

test('rejects photos larger than five megabytes', async () => {
  citizen = await createUser()
  const response = await request(app)
    .post('/api/potholes')
    .set('Authorization', authHeader(citizen))
    .field('lat', '12.8')
    .field('lng', '77.4')
    .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' })
  expect(response.status).toBe(413)
  expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE')
})

test('falls back to duplicate detection when photo comparison is unavailable', async () => {
  citizen = await createUser()
  await createReport()
  const response = await uploadPng()
  expect(response.status).toBe(409)
  expect(response.body.duplicate).toBe(true)
  expect(response.body.existingPothole.id).toBeTruthy()
})

test('forceNew saves a report despite a nearby duplicate and sanitizes text', async () => {
  citizen = await createUser()
  await createReport()
  const response = await uploadPng()
    .field('forceNew', 'true')
    .field('description', '<script>alert(1)</script>Road damage')
  const savedReport = await Pothole.findById(response.body.report?.id)
  expect(response.status).toBe(201)
  expect(savedReport.description).not.toMatch(/<script/i)
  expect(response.body.report).not.toHaveProperty('password')
})

test('blocks self-upvotes and repeated upvotes, and allows removal', async () => {
  citizen = await createUser('citizen', 'Voter')
  reporter = await createUser('citizen', 'Report Owner')
  const report = await createReport({ reportedBy: reporter._id })
  const ownVote = await request(app)
    .post(`/api/potholes/${report.id}/upvote`)
    .set('Authorization', authHeader(reporter))
  expect(ownVote.status).toBe(400)

  const voterAuth = authHeader(citizen)
  const firstVote = await request(app).post(`/api/potholes/${report.id}/upvote`).set('Authorization', voterAuth)
  const repeatedVote = await request(app).post(`/api/potholes/${report.id}/upvote`).set('Authorization', voterAuth)
  const removeVote = await request(app).delete(`/api/potholes/${report.id}/upvote`).set('Authorization', voterAuth)
  const savedVoter = await User.findById(citizen._id)
  const savedReporter = await User.findById(reporter._id)

  expect(firstVote.status).toBe(200)
  expect(repeatedVote.status).toBe(409)
  expect(removeVote.status).toBe(200)
  expect((await Pothole.findById(report.id)).upvoteCount).toBe(0)
  expect(savedVoter.points).toBe(1)
  expect(savedReporter.points).toBe(2)
})

test('uses the short public city report cache', async () => {
  const response = await request(app).get('/api/city-report')
  expect(response.status).toBe(200)
  expect(response.headers['cache-control']).toMatch(/max-age=30/)
})

test('paginated analytics endpoint returns report pagination to staff', async () => {
  authority = await createUser('authority')
  await createReport()
  const response = await request(app)
    .get('/api/analytics?page=1&limit=1')
    .set('Authorization', authHeader(authority))
  expect(response.status).toBe(200)
  expect(response.body.reports).toHaveLength(1)
  expect(response.body.reportPagination).toMatchObject({ page: 1, limit: 1, total: 1, pages: 1 })
})

test('applies dedicated rate limits to login, registration, reports, and upvotes', async () => {
  citizen = await createUser()
  const loginAttempts = []
  for (let index = 0; index < 6; index += 1) {
    loginAttempts.push(await request(app).post('/api/auth/login').send({
      email: `unknown-${index}@example.test`,
      password: 'WrongPassword123',
    }))
  }
  expect(loginAttempts.slice(0, 5).every((response) => response.status === 401)).toBe(true)
  expect(loginAttempts[5].status).toBe(429)

  const registrationAttempts = []
  for (let index = 0; index < 6; index += 1) {
    registrationAttempts.push(await request(app).post('/api/auth/register').send({}))
  }
  expect(registrationAttempts.slice(0, 5).every((response) => response.status === 400)).toBe(true)
  expect(registrationAttempts[5].status).toBe(429)

  const reportAttempts = []
  for (let index = 0; index < 11; index += 1) {
    reportAttempts.push(await request(app)
      .post('/api/potholes')
      .set('Authorization', authHeader(citizen)))
  }
  expect(reportAttempts.slice(0, 10).every((response) => response.status === 400)).toBe(true)
  expect(reportAttempts[10].status).toBe(429)

  const upvoteAttempts = []
  for (let index = 0; index < 31; index += 1) {
    upvoteAttempts.push(await request(app)
      .post('/api/potholes/65a000000000000000000001/upvote')
      .set('Authorization', authHeader(citizen)))
  }
  expect(upvoteAttempts.slice(0, 30).every((response) => response.status === 404)).toBe(true)
  expect(upvoteAttempts[30].status).toBe(429)
})
