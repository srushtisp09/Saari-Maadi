import '../config/loadEnv.js'
import dns from 'node:dns'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mongoose from 'mongoose'
import { connectDatabase, stopDatabase } from '../config/database.js'
import Pothole from '../models/Pothole.js'
import User from '../models/User.js'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const seedEmail = 'map-demo@sari-maadi.invalid'
const demoAccounts = [
  {
    name: 'Sari Maadi Demo Authority',
    email: 'authority-demo@sari-maadi.invalid',
    password: 'AuthorityDemo-2026!',
    role: 'authority',
  },
  {
    name: 'Sari Maadi Demo Admin',
    email: 'admin-demo@sari-maadi.invalid',
    password: 'AdminDemo-2026!',
    role: 'admin',
  },
]
const uploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads')
const seedPhotoName = 'seeded-pothole.svg'
const seedPhotoPath = path.join(uploadsDirectory, seedPhotoName)
const photoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><rect width="900" height="600" fill="#77736a"/><path d="M0 450 900 410v190H0Z" fill="#514d46"/><ellipse cx="450" cy="366" rx="210" ry="95" fill="#37332e"/><ellipse cx="450" cy="350" rx="175" ry="67" fill="#24221f"/><path d="M288 349c62-39 261-56 329 2-82 31-232 50-329-2Z" fill="#302d28"/><path d="M0 510h900" stroke="#fff8e7" stroke-width="8" stroke-dasharray="110 70"/></svg>`

const locations = [
  [12.9716, 77.5946], [12.9752, 77.6011], [12.9668, 77.5822],
  [12.9824, 77.6126], [12.9588, 77.6019], [12.9891, 77.5788],
  [12.9497, 77.5844], [12.9801, 77.5652], [12.9632, 77.6261],
  [12.9982, 77.6033], [12.9425, 77.6107], [12.9874, 77.6352],
  [12.9511, 77.5569], [13.0064, 77.5857], [12.9347, 77.5928],
]

async function seed() {
  await connectDatabase()
  if (process.env.NODE_ENV !== 'production') {
    for (const account of demoAccounts) {
      let user = await User.findOne({ email: account.email })
      if (!user) user = new User({ email: account.email })
      user.name = account.name
      user.password = account.password
      user.role = account.role
      user.seeded = true
      await user.save()
    }
    console.info('Development demo accounts (reset by running the seed command):')
    for (const account of demoAccounts) {
      console.info(`  ${account.role}: ${account.email} / ${account.password}`)
    }
  }

  let user = await User.findOne({ email: seedEmail })
  if (!user) {
    user = await User.create({
      name: 'Sari Maadi Map Demo',
      email: seedEmail,
      password: randomUUID(),
      seeded: true,
    })
  }

  const existing = await Pothole.countDocuments({ seeded: true })
  if (existing > 0) {
    console.info(`Map seed already present (${existing} reports); no duplicates added.`)
    return
  }

  await mkdir(uploadsDirectory, { recursive: true })
  await writeFile(seedPhotoPath, photoSvg, { flag: 'w' })

  const now = Date.now()
  const reports = locations.map(([lat, lng], index) => {
    const severity = (index % 5) + 1
    const fixed = index % 4 === 3
    return {
      reportedBy: user._id,
      photoUrl: `/uploads/${seedPhotoName}`,
      description: `Demo pothole report ${index + 1} near Bengaluru landmark.`,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      address: [
        'MG Road',
        'Indiranagar',
        'Jayanagar',
        'Malleshwaram',
        'Koramangala',
        'Vijayanagar',
        'Basavanagudi',
        'Rajajinagar',
        'Ulsoor',
        'Hebbal',
        'BTM Layout',
        'Whitefield',
        'Banashankari',
        'Yeshwanthpur',
        'JP Nagar',
      ][index],
      status: fixed ? 'fixed' : 'reported',
      ai: {
        checked: true,
        isPothole: true,
        severity,
        confidence: Number((0.72 + (index % 4) * 0.06).toFixed(2)),
        reason: `Demo report: ${severity === 1 ? 'small' : severity >= 4 ? 'large and potentially hazardous' : 'moderate'} road pothole.`,
      },
      createdAt: new Date(now - index * 3 * 60 * 60 * 1000),
      seeded: true,
    }
  })

  await Pothole.insertMany(reports)
  console.info(`Added ${reports.length} demo potholes around Bengaluru.`)
}

try {
  await seed()
} finally {
  if (mongoose.connection.readyState) await stopDatabase()
}
