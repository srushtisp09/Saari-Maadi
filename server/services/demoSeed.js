import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Pothole from '../models/Pothole.js'
import User from '../models/User.js'
import { storePhoto } from './photoStorage.js'

const locations = [
  ['MG Road', 12.9716, 77.5946],
  ['Indiranagar', 12.9752, 77.6011],
  ['Jayanagar', 12.9668, 77.5822],
  ['Malleshwaram', 12.9824, 77.6126],
  ['Koramangala', 12.9588, 77.6019],
  ['Vijayanagar', 12.9891, 77.5788],
  ['Basavanagudi', 12.9497, 77.5844],
  ['Rajajinagar', 12.9801, 77.5652],
  ['Ulsoor', 12.9632, 77.6261],
  ['Hebbal', 12.9982, 77.6033],
  ['BTM Layout', 12.9425, 77.6107],
  ['Whitefield', 12.9874, 77.6352],
  ['Banashankari', 12.9511, 77.5569],
  ['Yeshwanthpur', 13.0064, 77.5857],
  ['JP Nagar', 12.9347, 77.5928],
]
const statuses = ['reported', 'verified', 'in_progress', 'fixed', 'rejected']
const statusTransitions = {
  reported: [],
  verified: [['reported', 'verified']],
  in_progress: [['reported', 'verified'], ['verified', 'in_progress']],
  fixed: [['reported', 'verified'], ['verified', 'in_progress'], ['in_progress', 'fixed']],
  rejected: [['reported', 'rejected']],
}

async function findOrCreateDemoUser({ name, email, password, role }) {
  let user = await User.findOne({ email }).select('+seeded')
  if (!user) user = new User({ email })
  user.name = name
  user.password = password
  user.role = role
  user.seeded = true
  await user.save()
  return user
}

export async function seedDemoData() {
  if (process.env.DEMO_MODE?.trim().toLowerCase() !== 'true') return

  const [authority, citizen] = await Promise.all([
    findOrCreateDemoUser({
      name: 'Sari Maadi Demo Authority',
      email: 'authority-demo@sari-maadi.example',
      password: process.env.DEMO_AUTHORITY_PASSWORD,
      role: 'authority',
    }),
    findOrCreateDemoUser({
      name: 'Sari Maadi Demo Citizen',
      email: 'citizen-demo@sari-maadi.example',
      password: process.env.DEMO_CITIZEN_PASSWORD,
      role: 'citizen',
    }),
  ])

  const existingReports = await Pothole.countDocuments({ seeded: true })
  if (existingReports) {
    console.info(`Demo data already present (${existingReports} reports); no duplicates added.`)
    return
  }

  const scriptDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts')
  const photoFile = {
    buffer: await readFile(path.join(scriptDirectory, 'test-pothole.png')),
    mimetype: 'image/png',
  }
  const { photoUrl } = await storePhoto(photoFile)
  const now = Date.now()
  const reports = locations.map(([address, lat, lng], index) => {
    const status = statuses[index % statuses.length]
    const transitions = statusTransitions[status]
    const createdAt = new Date(now - (index + 1) * 24 * 60 * 60 * 1000)
    return {
      reportedBy: citizen._id,
      photoUrl,
      description: `Demo road-surface damage near ${address}; reported by a Bengaluru resident.`,
      location: { type: 'Point', coordinates: [lng, lat] },
      address,
      status,
      statusHistory: transitions.map(([from, to], step) => ({
        from,
        to,
        changedBy: authority._id,
        note: `Demo update: ${to.replace('_', ' ')} after field review.`,
        at: new Date(createdAt.getTime() + (step + 1) * 3 * 60 * 60 * 1000),
      })),
      fixedAt: status === 'fixed'
        ? new Date(createdAt.getTime() + transitions.length * 3 * 60 * 60 * 1000)
        : null,
      fixBonusAwarded: false,
      ai: {
        checked: true,
        isPothole: true,
        severity: (index % 5) + 1,
        confidence: Number((0.72 + (index % 4) * 0.06).toFixed(2)),
        reason: 'Demo report for portfolio walkthrough.',
      },
      createdAt,
      seeded: true,
    }
  })

  await Pothole.insertMany(reports)
  console.info(`Added ${reports.length} demo reports across all statuses.`)
}
