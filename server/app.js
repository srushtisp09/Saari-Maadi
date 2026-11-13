import cors from 'cors'
import express from 'express'
import authRoutes from './routes/auth.js'
import healthRoute from './routes/health.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '10kb' }))
app.use('/api/health', healthRoute)
app.use('/api/auth', authRoutes)

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

app.use((error, _req, res, _next) => {
  console.error('Request failed:', error)
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Request body must be valid JSON.' })
  }
  return res.status(500).json({ message: 'Something went wrong. Please try again.' })
})

export default app
