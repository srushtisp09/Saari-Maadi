import { rm } from 'node:fs/promises'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.afterAll(async () => {
  await rm(path.resolve('server', '.e2e-uploads'), { recursive: true, force: true })
})

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/r2cAAAAASUVORK5CYII=',
  'base64',
)

async function findReport(page, description) {
  const response = await page.request.get('/api/potholes?limit=100')
  expect(response.ok()).toBeTruthy()
  const { reports } = await response.json()
  const report = reports.find((item) => item.description === description)
  expect(report).toBeTruthy()
  return report
}

test('registers a citizen and submits a pothole report', async ({ page }) => {
  const email = `reporter-${Date.now()}@example.test`
  await page.goto('/register')
  await page.getByLabel('Your name').fill('E2E Citizen')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('E2ECitizenPass123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/home$/)

  await page.getByRole('link', { name: 'Report a pothole' }).first().click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'pothole.png',
    mimeType: 'image/png',
    buffer: png,
  })
  await page.getByRole('button', { name: 'Use my current location' }).click()
  await expect(page.getByText('Location ready')).toBeVisible()
  await page.getByLabel('Description (optional)').fill('E2E submitted road hazard')
  await page.getByRole('button', { name: 'Check photo & report' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'AI check was unavailable' })).toBeVisible()
  await expect(page.getByRole('button', { name: /View on map/ })).toBeVisible()
})

test('lets a signed-in citizen upvote an existing report', async ({ page }) => {
  const report = await findReport(page, 'E2E upvote target')
  await page.goto('/register')
  await page.getByLabel('Your name').fill('E2E Voter')
  await page.getByLabel('Email address').fill(`voter-${Date.now()}@example.test`)
  await page.getByLabel('Password').fill('E2EVoterPass123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.goto(`/potholes/${report.id}`)

  const upvote = page.getByRole('button', { name: /Upvote/ })
  const upvoteResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' &&
    response.url().includes(`/api/potholes/${report.id}/upvote`),
  )
  await upvote.click()
  const upvoteResponse = await upvoteResponsePromise
  const responseBody = await upvoteResponse.json()
  expect(upvoteResponse.status(), responseBody.message).toBe(200)
  await expect(upvote).toHaveAttribute('aria-pressed', 'true')
})

test('lets an authority advance a report status', async ({ page }) => {
  await findReport(page, 'E2E status target')
  await page.goto('/login')
  await page.getByLabel('Email address').fill('e2e-authority@example.test')
  await page.getByLabel('Password').fill('E2EAuthorityPass123')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.goto('/authority')

  const row = page.locator('.authority-report').filter({ hasText: 'E2E status target' })
  await row.getByRole('button', { name: 'Change status' }).click()
  await page.getByLabel('New status').selectOption('verified')
  await page.getByRole('button', { name: 'Save update' }).click()
  await expect(row).toContainText('Verified')
})

test('login page passes automated accessibility checks', async ({ page }) => {
  await page.goto('/login')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
