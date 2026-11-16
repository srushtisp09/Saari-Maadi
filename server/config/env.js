const LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

export function isDemoMode(env = process.env) {
  return env.DEMO_MODE?.trim().toLowerCase() === 'true'
}

function isValidOrigin(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) &&
      url.origin === value &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
  } catch {
    return false
  }
}

export function getAllowedOrigins(env = process.env) {
  const configured = env.CORS_ORIGINS?.trim()
  if (!configured && env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGINS must contain at least one approved web origin in production.')
  }

  const origins = configured
    ? configured.split(',').map((origin) => origin.trim()).filter(Boolean)
    : LOCAL_ORIGINS

  if (!origins.length || origins.some((origin) => !isValidOrigin(origin))) {
    throw new Error('CORS_ORIGINS must be a comma-separated list of valid origins without paths.')
  }

  return [...new Set(origins)]
}

export function validateEnvironment(env = process.env) {
  if (typeof env.JWT_SECRET !== 'string' || env.JWT_SECRET.trim().length < 32) {
    throw new Error('JWT_SECRET must be set to a randomly generated value of at least 32 characters.')
  }

  const port = env.PORT === undefined ? 5000 : Number(env.PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a whole number between 1 and 65535.')
  }

  const mongoUri = env.MONGO_URI?.trim()
  if (mongoUri && !/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) {
    throw new Error('MONGO_URI must be a valid mongodb:// or mongodb+srv:// connection string.')
  }
  if (env.NODE_ENV === 'production' && !mongoUri) {
    throw new Error('MONGO_URI is required in production.')
  }

  const cloudinaryKeys = [
    env.CLOUDINARY_CLOUD_NAME,
    env.CLOUDINARY_API_KEY,
    env.CLOUDINARY_API_SECRET,
  ]
  const configuredCloudinaryKeys = cloudinaryKeys.filter((value) => value?.trim()).length
  if (configuredCloudinaryKeys !== 0 && configuredCloudinaryKeys !== cloudinaryKeys.length) {
    throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set together.')
  }
  if (env.NODE_ENV === 'production' && configuredCloudinaryKeys !== cloudinaryKeys.length) {
    throw new Error('Cloudinary credentials are required in production.')
  }

  const demoMode = isDemoMode(env)
  if (env.DEMO_MODE !== undefined && !['true', 'false'].includes(env.DEMO_MODE.trim().toLowerCase())) {
    throw new Error('DEMO_MODE must be "true" or "false".')
  }
  if (demoMode) {
    for (const variable of ['DEMO_AUTHORITY_PASSWORD', 'DEMO_CITIZEN_PASSWORD']) {
      if (typeof env[variable] !== 'string' || env[variable].length < 8) {
        throw new Error(`${variable} must be set to at least 8 characters when DEMO_MODE is true.`)
      }
    }
  }

  if (env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.trim().length < 32) {
    throw new Error('JWT_REFRESH_SECRET must contain at least 32 characters when provided.')
  }

  const limitWindow = env.RATE_LIMIT_WINDOW_MS === undefined
    ? 15 * 60 * 1000
    : Number(env.RATE_LIMIT_WINDOW_MS)
  if (!Number.isInteger(limitWindow) || limitWindow < 1000) {
    throw new Error('RATE_LIMIT_WINDOW_MS must be a whole number of at least 1000.')
  }

  if (env.GEMINI_MODEL && !/^[A-Za-z0-9._-]+$/.test(env.GEMINI_MODEL.trim())) {
    throw new Error('GEMINI_MODEL contains unsupported characters.')
  }

  const allowedOrigins = getAllowedOrigins(env)
  return { port, mongoUri, allowedOrigins, limitWindow, demoMode }
}
