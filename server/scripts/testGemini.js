import '../config/loadEnv.js'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assessPothole, getGeminiErrorDetails } from '../config/gemini.js'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const imagePath = path.resolve(process.argv[2] || path.join(scriptDirectory, 'test-pothole.png'))
const extension = path.extname(imagePath).toLowerCase()
const mimeTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
])

if (!process.env.GEMINI_API_KEY?.trim()) {
  throw new Error('GEMINI_API_KEY is missing from server/.env or the process environment.')
}

const mimetype = mimeTypes.get(extension)
if (!mimetype) {
  throw new Error('Provide a JPEG, PNG, or WebP test image.')
}

try {
  const buffer = await readFile(imagePath)
  const result = await assessPothole({ buffer, mimetype })
  console.info(`Gemini model: ${process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'}`)
  console.info(JSON.stringify(result, null, 2))
} catch (error) {
  const { status, message } = getGeminiErrorDetails(error)
  console.error(`Gemini test failed (status=${status ?? 'unavailable'}): ${message}`)
  process.exitCode = 1
}
