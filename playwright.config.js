import { defineConfig, devices } from '@playwright/test'

const e2eEnvironment = {
  NODE_ENV: 'test',
  PORT: '5100',
  MONGO_URI: '',
  JWT_SECRET: 'sari-maadi-e2e-secret-with-more-than-32-characters',
  CORS_ORIGINS: 'http://127.0.0.1:5178',
  GEMINI_API_KEY: '',
  RATE_LIMIT_WINDOW_MS: '60000',
  UPLOADS_DIR: 'server/.e2e-uploads',
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5178',
    ...devices['Desktop Chrome'],
    permissions: ['geolocation'],
    geolocation: { latitude: 12.9716, longitude: 77.5946 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node server/scripts/e2eServer.js',
      url: 'http://127.0.0.1:5100/api/health',
      env: e2eEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:client -- --port 5178',
      url: 'http://127.0.0.1:5178',
      env: { ...e2eEnvironment, VITE_API_TARGET: 'http://127.0.0.1:5100' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
