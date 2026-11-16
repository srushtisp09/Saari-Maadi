import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import pino from 'pino'
import swaggerUi from 'swagger-ui-express'
import { getAllowedOrigins } from './config/env.js'
import authRoutes from './routes/auth.js'
import healthRoute from './routes/health.js'
import potholeRoutes from './routes/potholes.js'
import statsRoute from './routes/stats.js'
import notificationRoutes from './routes/notifications.js'
import insightsRoutes from './routes/insights.js'
import { apiLimiter } from './middleware/rateLimits.js'
import { sanitizeRequest } from './middleware/sanitizeRequest.js'
import { uploadsDirectory } from './middleware/upload.js'
import openApiDocument from './openapi.js'

const app = express()
const allowedOrigins = getAllowedOrigins()
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

function normalizeErrorResponses(_req, res, next) {
  const json = res.json.bind(res)
  res.json = (body) => {
    if (res.statusCode < 400 || body?.error) return json(body)
    const message = typeof body?.message === 'string'
      ? body.message
      : 'The request could not be completed.'
    const code = body?.code || ({
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
    }[res.statusCode] || 'REQUEST_ERROR')
    return json({
      ...body,
      error: { code, message, ...(body?.details ? { details: body.details } : {}) },
      message,
    })
  }
  return next()
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
}))
app.use(pinoHttp({
  logger: pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      censor: '[REDACTED]',
    },
  }),
  autoLogging: process.env.NODE_ENV !== 'test',
}))
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    const error = new Error('Origin is not allowed by the CORS policy.')
    error.status = 403
    return callback(error)
  },
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json({ limit: '10kb' }))
app.use(sanitizeRequest)
app.use('/api', apiLimiter)
app.use(normalizeErrorResponses)
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(uploadsDirectory, { fallthrough: false }))
}
app.get('/api/docs/openapi.json', (_req, res) => res.json(openApiDocument))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))
app.use('/api/health', healthRoute)
app.use('/api/stats', statsRoute)
app.use('/api/notifications', notificationRoutes)
app.use('/api', insightsRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/potholes', potholeRoutes)

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

app.use((error, _req, res, _next) => {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : error instanceof SyntaxError && 'body' in error
      ? 400
      : 500
  const message = status === 400 && error instanceof SyntaxError && 'body' in error
    ? 'Request body must be valid JSON.'
    : status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : error.message || 'The request could not be completed.'
  _req.log?.error({ err: error, status }, 'Request failed')
  return res.status(status).json({
    error: {
      code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
      message,
    },
    message,
  })
})

export default app
