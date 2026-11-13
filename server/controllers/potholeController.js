import fs from 'node:fs/promises'
import path from 'node:path'
import Pothole from '../models/Pothole.js'
import User from '../models/User.js'
import { assessPothole } from '../config/gemini.js'
import { getPhotoStorageInfo } from '../middleware/upload.js'

function publicReport(report) {
  return {
    id: report.id,
    reportedBy: report.reportedBy,
    photoUrl: report.photoUrl,
    description: report.description,
    location: report.location,
    address: report.address,
    status: report.status,
    ai: report.ai,
    createdAt: report.createdAt,
  }
}

function absolutePhotoUrl(req, report) {
  if (!report.photoUrl || /^https?:\/\//i.test(report.photoUrl)) return report.photoUrl
  const origin = `${req.protocol}://${req.get('host')}`
  return `${origin}${report.photoUrl.startsWith('/') ? '' : '/'}${report.photoUrl}`
}

function serializeReport(req, report) {
  const id = report.id ?? report._id.toString()
  const reporter = report.reportedBy
  return {
    ...publicReport({ ...report, id }),
    photoUrl: absolutePhotoUrl(req, report),
    reportedBy: reporter
      ? {
          id: reporter._id?.toString?.() ?? reporter.id ?? reporter.toString(),
          name: reporter.name,
        }
      : null,
  }
}

async function removeUploadedFile(file) {
  if (!file?.storagePath) return
  try {
    await fs.unlink(file.storagePath)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

export async function createReport(req, res, next) {
  const file = req.file
  try {
    if (!file) {
      return res.status(400).json({ message: 'Choose a pothole photo to upload.' })
    }

    const lat = Number(req.body?.lat)
    const lng = Number(req.body?.lng)
    if (
      typeof req.body?.lat !== 'string' ||
      typeof req.body?.lng !== 'string' ||
      !req.body.lat.trim() ||
      !req.body.lng.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      await removeUploadedFile(file)
      return res.status(400).json({
        message: 'Enter valid latitude (-90 to 90) and longitude (-180 to 180).',
      })
    }

    if (typeof req.body.description === 'string' && req.body.description.length > 300) {
      await removeUploadedFile(file)
      return res.status(400).json({ message: 'Description must be 300 characters or fewer.' })
    }

    const signatureIsValid =
      (file.mimetype === 'image/jpeg' &&
        file.buffer.length >= 3 &&
        file.buffer[0] === 0xff &&
        file.buffer[1] === 0xd8 &&
        file.buffer[2] === 0xff) ||
      (file.mimetype === 'image/png' &&
        file.buffer.length >= 8 &&
        file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (file.mimetype === 'image/webp' &&
        file.buffer.length >= 12 &&
        file.buffer.toString('ascii', 0, 4) === 'RIFF' &&
        file.buffer.toString('ascii', 8, 12) === 'WEBP')
    if (!signatureIsValid) {
      return res.status(400).json({
        message: 'The photo contents do not match a valid JPEG, PNG, or WebP image.',
      })
    }

    let ai
    let aiSkippedMessage
    try {
      ai = await assessPothole(file)
    } catch (error) {
      ai = {
        checked: false,
        isPothole: false,
        severity: null,
        confidence: null,
        reason: '',
      }
      aiSkippedMessage = 'AI check was skipped; your report was saved and will not be lost.'
      const apiKey = process.env.GEMINI_API_KEY?.trim()
      const safeMessage = apiKey
        ? error.message.replaceAll(apiKey, '[REDACTED]')
        : error.message
      console.error(`Gemini check skipped: ${safeMessage}`)
    }

    if (ai.checked && !ai.isPothole) {
      return res.status(422).json({
        message: `This photo was not recognized as a pothole. ${ai.reason} Please retake the photo and try again.`,
        ai,
      })
    }

    const { directory, filename } = getPhotoStorageInfo(file)
    file.storagePath = path.join(directory, filename)
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(file.storagePath, file.buffer, { flag: 'wx' })

    let report = await Pothole.create({
      reportedBy: req.user._id,
      photoUrl: `/uploads/${filename}`,
      description: req.body.description?.trim() || undefined,
      location: { type: 'Point', coordinates: [lng, lat] },
      ai,
    })

    let pointsAwarded = 0
    if (ai.checked && ai.isPothole) {
      await User.updateOne({ _id: req.user._id }, { $inc: { points: 10 } })
      pointsAwarded = 10
    }

    report = await Pothole.findById(report._id).populate('reportedBy', 'name')
    const user = await User.findById(req.user._id).select('points')
    return res.status(201).json({
      message: aiSkippedMessage || 'Pothole report submitted successfully.',
      report: serializeReport(req, report),
      pointsAwarded,
      totalPoints: user.points,
    })
  } catch (error) {
    try {
      await removeUploadedFile(file)
    } catch (cleanupError) {
      console.error('Could not remove the failed pothole photo upload:', cleanupError)
    }
    return next(error)
  }
}

export async function listReports(req, res, next) {
  try {
    const { status, severity, limit: limitParam, page: pageParam, mine } = req.query
    if (status !== undefined && !['reported', 'fixed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either "reported" or "fixed".' })
    }
    if (severity !== undefined) {
      const minimumSeverity = Number(severity)
      if (!Number.isInteger(minimumSeverity) || minimumSeverity < 1 || minimumSeverity > 5) {
        return res.status(400).json({ message: 'Minimum severity must be a whole number from 1 to 5.' })
      }
    }
    if (mine !== undefined && mine !== 'true' && mine !== 'false') {
      return res.status(400).json({ message: 'The mine filter must be "true" or "false".' })
    }
    const limit = limitParam === undefined ? 100 : Number(limitParam)
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return res.status(400).json({ message: 'Limit must be a whole number from 1 to 200.' })
    }
    const page = pageParam === undefined ? 1 : Number(pageParam)
    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ message: 'Page must be a positive whole number.' })
    }
    if (mine === 'true' && !req.user) {
      return res.status(401).json({ message: 'Sign in to view your reports.' })
    }

    const filter = {}
    if (mine === 'true') filter.reportedBy = req.user._id
    if (status) filter.status = status
    if (severity !== undefined) filter['ai.severity'] = { $gte: Number(severity) }

    const [reports, total] = await Promise.all([
      Pothole.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reportedBy', 'name')
        .lean(),
      Pothole.countDocuments(filter),
    ])

    return res.json({
      reports: reports.map((report) => serializeReport(req, report)),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (error) {
    return next(error)
  }
}

export async function nearbyReports(req, res, next) {
  try {
    const { lat: latValue, lng: lngValue, radius: radiusValue } = req.query
    const lat = Number(latValue)
    const lng = Number(lngValue)
    const radius = radiusValue === undefined ? 500 : Number(radiusValue)

    if (
      typeof latValue !== 'string' ||
      !latValue.trim() ||
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90
    ) {
      return res.status(400).json({ message: 'Latitude is required and must be between -90 and 90.' })
    }
    if (
      typeof lngValue !== 'string' ||
      !lngValue.trim() ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({ message: 'Longitude is required and must be between -180 and 180.' })
    }
    if (!Number.isInteger(radius) || radius < 1 || radius > 5000) {
      return res.status(400).json({ message: 'Radius must be a whole number from 1 to 5000 meters.' })
    }

    const reports = await Pothole.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    })
      .limit(200)
      .populate('reportedBy', 'name')
      .lean()

    return res.json({
      reports: reports.map((report) => serializeReport(req, report)),
      count: reports.length,
      radius,
    })
  } catch (error) {
    return next(error)
  }
}

export async function getReport(req, res, next) {
  try {
    const report = await Pothole.findById(req.params.id)
      .populate('reportedBy', 'name')
      .lean()
    if (!report) return res.status(404).json({ message: 'Pothole report not found.' })

    return res.json({ report: serializeReport(req, report) })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Pothole report id is invalid.' })
    }
    return next(error)
  }
}
