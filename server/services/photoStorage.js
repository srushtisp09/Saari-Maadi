import { createHash, randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { uploadsDirectory } from '../middleware/upload.js'

const MIME_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
])

function cloudinaryConfiguration() {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env
  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

function signParameters(parameters, apiSecret) {
  const payload = Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

async function cloudinaryRequest(endpoint, fields) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value)
  }
  const response = await fetch(endpoint, { method: 'POST', body: form })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error?.message || `Cloudinary request failed with status ${response.status}.`)
  }
  return body
}

export async function storePhoto(file) {
  const cloudinary = cloudinaryConfiguration()
  if (cloudinary) {
    const timestamp = Math.floor(Date.now() / 1000)
    const publicId = randomUUID()
    const parameters = { folder: 'sari-maadi/reports', public_id: publicId, timestamp }
    const result = await cloudinaryRequest(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinary.cloudName)}/image/upload`,
      {
        ...parameters,
        api_key: cloudinary.apiKey,
        signature: signParameters(parameters, cloudinary.apiSecret),
        file: new Blob([file.buffer], { type: file.mimetype }),
      },
    )
    if (typeof result.secure_url !== 'string' || typeof result.public_id !== 'string') {
      throw new Error('Cloudinary returned an incomplete photo upload response.')
    }
    file.cloudinaryPublicId = result.public_id
    return { photoUrl: result.secure_url }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cloudinary photo storage is required in production.')
  }
  const extension = MIME_EXTENSIONS.get(file.mimetype)
  if (!extension) throw new Error('Photo format is not supported by local storage.')
  const filename = `${randomUUID()}${extension}`
  const storagePath = path.join(uploadsDirectory, filename)
  await mkdir(uploadsDirectory, { recursive: true })
  await writeFile(storagePath, file.buffer, { flag: 'wx' })
  file.storagePath = storagePath
  return { photoUrl: `/uploads/${filename}` }
}

export async function removeStoredPhoto(file) {
  if (file?.cloudinaryPublicId) {
    const cloudinary = cloudinaryConfiguration()
    if (!cloudinary) throw new Error('Cloudinary credentials are unavailable for photo cleanup.')
    const timestamp = Math.floor(Date.now() / 1000)
    const parameters = { public_id: file.cloudinaryPublicId, timestamp }
    const result = await cloudinaryRequest(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinary.cloudName)}/image/destroy`,
      {
        ...parameters,
        api_key: cloudinary.apiKey,
        signature: signParameters(parameters, cloudinary.apiSecret),
      },
    )
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary did not remove the uploaded photo (${result.result}).`)
    }
    return
  }
  if (file?.storagePath) await unlink(file.storagePath)
}

export async function removeStoredPhotoUrl(photoUrl) {
  const url = new URL(photoUrl, 'http://localhost')
  if (url.protocol === 'https:' && url.hostname === 'res.cloudinary.com') {
    const cloudName = getCloudinaryCloudName()
    const uploadPrefix = `/${cloudName}/image/upload/`
    if (!cloudName || !url.pathname.startsWith(uploadPrefix)) {
      throw new Error('Photo URL is not in the configured Cloudinary account.')
    }
    const pathAfterUpload = url.pathname.slice(uploadPrefix.length).split('/')
    if (/^v\d+$/.test(pathAfterUpload[0])) pathAfterUpload.shift()
    const cloudinaryPublicId = decodeURIComponent(pathAfterUpload.join('/')).replace(/\.[^.]+$/, '')
    await removeStoredPhoto({ cloudinaryPublicId })
    return
  }
  if (url.protocol !== 'http:' || !url.pathname.startsWith('/uploads/')) {
    throw new Error('Photo URL is not stored in a supported location.')
  }
  await unlink(path.resolve(uploadsDirectory, path.basename(url.pathname)))
}

export function getPhotoMimeType(photoUrl) {
  const extension = path.extname(photoUrl).toLowerCase()
  return new Map([
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp'],
  ]).get(extension)
}

export function getCloudinaryCloudName() {
  return cloudinaryConfiguration()?.cloudName
}
