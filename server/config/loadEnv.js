import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(serverDirectory, '.env')
const result = dotenv.config({ path: envPath })

if (result.error && result.error.code !== 'ENOENT') {
  throw new Error(`Could not load server configuration from ${envPath}: ${result.error.message}`)
}

export { envPath }
