import '../config/loadEnv.js'
import dns from 'node:dns'
import { unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mongoose from 'mongoose'
import { connectDatabase, stopDatabase } from '../config/database.js'
import Pothole from '../models/Pothole.js'
import User from '../models/User.js'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const seedEmail = 'map-demo@sari-maadi.invalid'
const uploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads')

try {
  await connectDatabase()
  const reports = await Pothole.find({ seeded: true }).select('photoUrl').lean()
  const reportIds = reports.map((report) => report._id)
  const photoPaths = new Set(
    reports
      .map((report) => report.photoUrl)
      .filter((url) => url?.startsWith('/uploads/'))
      .map((url) => path.join(uploadsDirectory, path.basename(url))),
  )

  const reportResult = await Pothole.deleteMany({ seeded: true })
  const demoUser = await User.findOne({ email: seedEmail }).select('+seeded')
  let usersRemoved = 0
  if (demoUser?.seeded) {
    const remainingReports = await Pothole.countDocuments({ reportedBy: demoUser._id })
    if (remainingReports === 0) {
      await User.deleteOne({ _id: demoUser._id, seeded: true })
      usersRemoved = 1
    }
  }

  let photosRemoved = 0
  for (const photoPath of photoPaths) {
    const photoUrl = `/uploads/${path.basename(photoPath)}`
    const stillReferenced = await Pothole.exists({ photoUrl })
    if (!stillReferenced) {
      try {
        await unlink(photoPath)
        photosRemoved += 1
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
  }

  console.info(
    `Removed ${reportResult.deletedCount} seeded reports, ${usersRemoved} seed-only users, and ${photosRemoved} unreferenced seed images.`,
  )
  if (reportIds.length !== reportResult.deletedCount) {
    console.warn('Some seeded reports changed during cleanup.')
  }
} finally {
  if (mongoose.connection.readyState) await stopDatabase()
}
