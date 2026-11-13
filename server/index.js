import 'dotenv/config'
import app from './app.js'
import { connectDatabase, stopDatabase } from './config/database.js'

const port = Number(process.env.PORT) || 5000

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a randomly generated value of at least 32 characters.')
}

await connectDatabase()
const server = app.listen(port, () => {
  console.info(`Sari Maadi API listening on http://localhost:${port}`)
})

async function shutdown(signal) {
  console.info(`${signal} received; shutting down.`)
  server.close(async (error) => {
    if (error) {
      console.error('Failed to close the HTTP server cleanly:', error)
      process.exitCode = 1
    }
    try {
      await stopDatabase()
    } catch (databaseError) {
      console.error('Failed to close the database cleanly:', databaseError)
      process.exitCode = 1
    }
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
