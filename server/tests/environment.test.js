import { validateEnvironment } from '../config/env.js'

const validEnvironment = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
}

test('accepts a valid environment and applies the local defaults', () => {
  expect(validateEnvironment(validEnvironment)).toMatchObject({
    port: 5000,
    mongoUri: undefined,
    allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    limitWindow: 15 * 60 * 1000,
  })
})

test.each(['', 'too-short'])('rejects a missing or short JWT secret: %s', (JWT_SECRET) => {
  expect(() => validateEnvironment({ ...validEnvironment, JWT_SECRET })).toThrow(
    /JWT_SECRET must be set/i,
  )
})

test('rejects invalid ports and MongoDB URI schemes at startup', () => {
  expect(() => validateEnvironment({ ...validEnvironment, PORT: '70000' })).toThrow(/PORT/i)
  expect(() => validateEnvironment({ ...validEnvironment, MONGO_URI: 'https://db.example' })).toThrow(/MONGO_URI/i)
})

test('requires persistent MongoDB and Cloudinary configuration in production', () => {
  const productionEnvironment = {
    ...validEnvironment,
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://saari-maadi.vercel.app',
  }
  expect(() => validateEnvironment(productionEnvironment)).toThrow(/MONGO_URI/i)

  expect(() => validateEnvironment({
    ...productionEnvironment,
    MONGO_URI: 'mongodb+srv://cluster.example/sari-maadi',
  })).toThrow(/Cloudinary/i)

  expect(validateEnvironment({
    ...productionEnvironment,
    MONGO_URI: 'mongodb+srv://cluster.example/sari-maadi',
    CLOUDINARY_CLOUD_NAME: 'demo-cloud',
    CLOUDINARY_API_KEY: '123456',
    CLOUDINARY_API_SECRET: 'secret',
  })).toMatchObject({ demoMode: false })
})

test('requires environment-provided passwords when demo mode is enabled', () => {
  expect(() => validateEnvironment({ ...validEnvironment, DEMO_MODE: 'true' }))
    .toThrow(/DEMO_AUTHORITY_PASSWORD/)
  expect(validateEnvironment({
    ...validEnvironment,
    DEMO_MODE: 'true',
    DEMO_AUTHORITY_PASSWORD: 'Authority-Secret-123',
    DEMO_CITIZEN_PASSWORD: 'Citizen-Secret-123',
  })).toMatchObject({ demoMode: true })
})

test('rejects malformed or missing production CORS allowlists', () => {
  const productionDependencies = {
    MONGO_URI: 'mongodb+srv://cluster.example/sari-maadi',
    CLOUDINARY_CLOUD_NAME: 'demo-cloud',
    CLOUDINARY_API_KEY: '123456',
    CLOUDINARY_API_SECRET: 'secret',
  }
  expect(() => validateEnvironment({
    ...validEnvironment,
    NODE_ENV: 'production',
    CORS_ORIGINS: '',
    ...productionDependencies,
  })).toThrow(/CORS_ORIGINS/i)
  expect(() => validateEnvironment({
    ...validEnvironment,
    ...productionDependencies,
    CORS_ORIGINS: 'https://trusted.example/path',
  })).toThrow(/CORS_ORIGINS/i)
})
