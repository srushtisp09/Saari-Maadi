import '../config/loadEnv.js'
import dns from 'node:dns'
import mongoose from 'mongoose'
import { connectDatabase, stopDatabase } from '../config/database.js'
import Pothole from '../models/Pothole.js'
import User from '../models/User.js'
import { removeStoredPhotoUrl } from '../services/photoStorage.js'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const seedEmails = [
  'map-demo@sari-maadi.invalid',
  'authority-demo@sari-maadi.invalid',
  'admin-demo@sari-maadi.invalid',
  'authority-demo@sari-maadi.example',
  'citizen-demo@sari-maadi.example',
]

try {
  await connectDatabase()
  const reports = await Pothole.find({ seeded: true }).select('photoUrl').lean()
  const reportIds = reports.map((report) => report._id)
  const photoUrls = new Set(reports.map((report) => report.photoUrl).filter(Boolean))

  const reportResult = await Pothole.deleteMany({ seeded: true })
  const demoUsers = await User.find({ email: { $in: seedEmails } }).select('+seeded')
  let usersRemoved = 0
  for (const demoUser of demoUsers) {
    if (!demoUser.seeded) continue
    const remainingReports = await Pothole.countDocuments({ reportedBy: demoUser._id })
    if (remainingReports === 0) {
      await User.deleteOne({ _id: demoUser._id, seeded: true })
      usersRemoved += 1
    }
  }

  let photosRemoved = 0
  for (const photoUrl of photoUrls) {
    const stillReferenced = await Pothole.exists({ photoUrl })
    if (!stillReferenced) {
      try {
        await removeStoredPhotoUrl(photoUrl)
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
