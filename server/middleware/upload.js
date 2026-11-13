import multer from 'multer'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const uploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads')
const acceptedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
])

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!acceptedTypes.has(file.mimetype)) {
      const error = new Error('Photo must be a JPEG, PNG, or WebP image.')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

export function handlePhotoUpload(req, res, next) {
  photoUpload.single('photo')(req, res, (error) => {
    if (!error) return next()
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Photo must be 5 MB or smaller.' })
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Upload one image using the photo field.' })
    }
    return res.status(error.status || 400).json({ message: error.message })
  })
}

export function getPhotoStorageInfo(file) {
  const extension = acceptedTypes.get(file.mimetype)
  return {
    directory: uploadsDirectory,
    filename: `${randomUUID()}${extension}`,
  }
}
