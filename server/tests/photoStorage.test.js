import { jest } from '@jest/globals'
import { removeStoredPhoto, storePhoto } from '../services/photoStorage.js'

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
}
const originalFetch = globalThis.fetch

beforeEach(() => {
  process.env.NODE_ENV = 'test'
  delete process.env.CLOUDINARY_CLOUD_NAME
  delete process.env.CLOUDINARY_API_KEY
  delete process.env.CLOUDINARY_API_SECRET
})

afterEach(() => {
  globalThis.fetch = originalFetch
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('stores images in local development and removes them after a failed report', async () => {
  const file = { buffer: Buffer.from('local test photo'), mimetype: 'image/png' }
  const { photoUrl } = await storePhoto(file)

  expect(photoUrl).toMatch(/^\/uploads\/.+\.png$/)
  await expect(removeStoredPhoto(file)).resolves.toBeUndefined()
})

test('uses signed Cloudinary storage when credentials are configured', async () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud'
  process.env.CLOUDINARY_API_KEY = 'demo-key'
  process.env.CLOUDINARY_API_SECRET = 'demo-secret'
  globalThis.fetch = jest.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({
      public_id: 'sari-maadi/reports/report-id',
      secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v123/sari-maadi/reports/report-id.png',
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ result: 'ok' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

  const file = { buffer: Buffer.from('cloud test photo'), mimetype: 'image/png' }
  const { photoUrl } = await storePhoto(file)
  expect(photoUrl).toContain('res.cloudinary.com/demo-cloud')
  expect(file.cloudinaryPublicId).toBe('sari-maadi/reports/report-id')

  const [uploadUrl, uploadRequest] = globalThis.fetch.mock.calls[0]
  expect(uploadUrl).toContain('/image/upload')
  expect(uploadRequest.body.get('api_key')).toBe('demo-key')
  expect(uploadRequest.body.get('folder')).toBe('sari-maadi/reports')
  expect(uploadRequest.body.get('signature')).toMatch(/^[a-f0-9]{40}$/)

  await expect(removeStoredPhoto(file)).resolves.toBeUndefined()
  expect(globalThis.fetch.mock.calls[1][0]).toContain('/image/destroy')
})

test('refuses local-disk fallback in production', async () => {
  process.env.NODE_ENV = 'production'
  const file = { buffer: Buffer.from('production test photo'), mimetype: 'image/png' }

  await expect(storePhoto(file)).rejects.toThrow(/Cloudinary photo storage is required/i)
})
