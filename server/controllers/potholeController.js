import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Pothole from '../models/Pothole.js'
import User from '../models/User.js'
import {
  getSlaDays,
  isOpenStatus,
  isSlaBreached,
  SLA_DAYS,
} from '../config/sla.js'
import { FIXED_REPORTER_BONUS_POINTS } from '../config/rewards.js'
import { getBadgeDetails } from '../config/badges.js'
import { awardBadgesForUser } from '../services/badges.js'
import { awardPoints } from '../services/points.js'
import {
  assessPothole,
  comparePotholePhotos,
  getGeminiErrorDetails,
} from '../config/gemini.js'
import { getPhotoStorageInfo } from '../middleware/upload.js'
import { createNotification } from '../services/notifications.js'

const uploadsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../uploads',
)
const DAY_MS = 24 * 60 * 60 * 1000
const STATUS_TRANSITIONS = Object.freeze({
  reported: ['verified', 'rejected'],
  verified: ['in_progress', 'rejected'],
  in_progress: ['fixed', 'rejected'],
  fixed: [],
  rejected: [],
})
const REPORT_STATUSES = Object.keys(STATUS_TRANSITIONS)

function getDaysOpen(report, now = Date.now()) {
  if (!isOpenStatus(report.status)) return null
  return Math.max(0, Math.floor((now - new Date(report.createdAt).getTime()) / DAY_MS))
}

function getPriorityScore(report, daysOpen = getDaysOpen(report) ?? 0) {
  const severity = report.ai?.checked ? report.ai.severity || 0 : 0
  return severity * 2 + (report.upvoteCount ?? report.upvotes?.length ?? 0) + Math.min(daysOpen, 30) / 3
}

function publicReport(report) {
  return {
    id: report.id,
    reportedBy: report.reportedBy,
    photoUrl: report.photoUrl,
    description: report.description,
    location: report.location,
    address: report.address,
    status: report.status,
    statusHistory: report.statusHistory || [],
    fixedAt: report.fixedAt || null,
    afterPhotoUrl: report.afterPhotoUrl || null,
    ai: report.ai,
    createdAt: report.createdAt,
    upvoteCount: report.upvoteCount ?? report.upvotes?.length ?? 0,
    hasUpvoted: false,
    daysOpen: getDaysOpen(report),
    priorityScore: getPriorityScore(report),
    slaDays: getSlaDays(report),
    slaBreached: isSlaBreached(report),
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
  const currentUserId = req.user?._id?.toString()
  const upvotes = report.upvotes || []
  return {
    ...publicReport({ ...report, id }),
    photoUrl: absolutePhotoUrl(req, report),
    hasUpvoted: Boolean(
      currentUserId && upvotes.some((voterId) => voterId.toString() === currentUserId),
    ),
    reportedBy: reporter
      ? {
          id: reporter._id?.toString?.() ?? reporter.id ?? reporter.toString(),
          name: reporter.name,
          badges: getBadgeDetails(reporter.badges || []),
        }
      : null,
  }
}

function getPhotoMimeType(photoUrl) {
  const extension = path.extname(photoUrl).toLowerCase()
  return new Map([
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp'],
  ]).get(extension)
}

async function readReportPhoto(photoUrl) {
  const pathname = new URL(photoUrl, 'http://localhost').pathname
  if (!pathname.startsWith('/uploads/')) {
    throw new Error('Existing report photo is not stored locally.')
  }
  const imagePath = path.resolve(uploadsDirectory, path.basename(pathname))
  if (path.dirname(imagePath) !== uploadsDirectory) {
    throw new Error('Existing report photo path is invalid.')
  }
  const mimetype = getPhotoMimeType(imagePath)
  if (!mimetype) throw new Error('Existing report photo format is not supported.')
  return { buffer: await fs.readFile(imagePath), mimetype }
}

async function findDuplicateReport(req, file, coordinates) {
  const candidates = await Pothole.find({
    status: 'reported',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: 30,
      },
    },
  })
    .limit(3)
    .lean()

  if (!candidates.length) return null

  try {
    for (const candidate of candidates) {
      const existingPhoto = await readReportPhoto(candidate.photoUrl)
      const comparison = await comparePotholePhotos(file, existingPhoto)
      if (comparison.samePothole && comparison.confidence >= 0.7) {
        return { candidate, fallback: false }
      }
    }
    return null
  } catch (error) {
    const { status, message } = getGeminiErrorDetails(error)
    console.error(
      `Gemini duplicate check failed (status=${status ?? 'unavailable'}): ${message}`,
    )
    return { candidate: candidates[0], fallback: true }
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

    if (
      req.body.forceNew !== undefined &&
      req.body.forceNew !== 'true' &&
      req.body.forceNew !== 'false'
    ) {
      return res.status(400).json({ message: 'forceNew must be "true" or "false".' })
    }

    if (req.body.forceNew !== 'true') {
      const duplicate = await findDuplicateReport(req, file, [lng, lat])
      if (duplicate) {
        const existing = duplicate.candidate
        const responseReport = serializeReport(req, existing)
        return res.status(409).json({
          message: duplicate.fallback
            ? 'A reported pothole is already within 30 meters. Gemini could not compare the photos, so this may be a duplicate.'
            : 'This appears to be the same pothole as an existing report.',
          duplicate: true,
          fallback: duplicate.fallback,
          existingPothole: {
            id: responseReport.id,
            photoUrl: responseReport.photoUrl,
            severity: existing.ai?.checked ? existing.ai.severity : null,
            upvoteCount: responseReport.upvoteCount,
            daysOpen: responseReport.daysOpen,
            hasUpvoted: responseReport.hasUpvoted,
          },
        })
      }
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
      const { status, message } = getGeminiErrorDetails(error)
      console.error(
        `Gemini check skipped (status=${status ?? 'unavailable'}): ${message}`,
      )
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
      const awarded = await awardPoints({
        userId: req.user._id,
        amount: 10,
        reason: 'verified_report',
        eventKey: `report:${report._id}:verified-report`,
      })
      if (awarded) pointsAwarded = 10
    }
    await awardBadgesForUser(req.user._id)

    report = await Pothole.findById(report._id)
      .populate('reportedBy', 'name badges')
      .lean()
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
    if (status !== undefined && !REPORT_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${REPORT_STATUSES.join(', ')}.` })
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
    if (typeof req.query.area === 'string' && req.query.area.trim()) {
      const area = req.query.area.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.address = { $regex: area, $options: 'i' }
    }

    if (req.query.sort !== undefined && req.query.sort !== 'priority') {
      return res.status(400).json({ message: 'Sort must be "priority" when provided.' })
    }

    const reportQuery = req.query.sort === 'priority'
      ? Pothole.aggregate([
          { $match: filter },
          {
            $addFields: {
              daysOpen: {
                $cond: [
                  { $in: ['$status', ['reported', 'verified', 'in_progress']] },
                  {
                    $max: [
                      0,
                      { $floor: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, DAY_MS] } },
                    ],
                  },
                  null,
                ],
              },
              upvoteCount: {
                $ifNull: ['$upvoteCount', { $size: { $ifNull: ['$upvotes', []] } }],
              },
              _prioritySeverity: {
                $cond: [
                  { $eq: ['$ai.checked', true] },
                  { $ifNull: ['$ai.severity', 0] },
                  0,
                ],
              },
            },
          },
          {
            $addFields: {
              priorityScore: {
                $add: [
                  { $multiply: ['$_prioritySeverity', 2] },
                  '$upvoteCount',
                  { $divide: [{ $min: [{ $ifNull: ['$daysOpen', 0] }, 30] }, 3] },
                ],
              },
            },
          },
          { $sort: { priorityScore: -1, createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: User.collection.name,
              let: { reporterId: '$reportedBy' },
              pipeline: [
                { $match: { $expr: { $eq: ['$_id', '$$reporterId'] } } },
                { $project: { name: 1, badges: 1 } },
              ],
              as: 'reporterInfo',
            },
          },
          { $addFields: { reportedBy: { $arrayElemAt: ['$reporterInfo', 0] } } },
          { $project: { reporterInfo: 0, _prioritySeverity: 0 } },
        ])
      : Pothole.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('reportedBy', 'name badges')
          .lean()

    const [reports, total] = await Promise.all([
      reportQuery,
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
      .populate('reportedBy', 'name badges')
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
      .populate('reportedBy', 'name badges')
      .populate('statusHistory.changedBy', 'name')
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

export async function upvoteReport(req, res, next) {
  try {
    const report = await Pothole.findOneAndUpdate(
      {
        _id: req.params.id,
        reportedBy: { $ne: req.user._id },
        upvotes: { $ne: req.user._id },
      },
      {
        $addToSet: { upvotes: req.user._id },
        $inc: { upvoteCount: 1 },
      },
      { returnDocument: 'after' },
    )
      .populate('reportedBy', 'name badges')
      .lean()

    if (!report) {
      const existing = await Pothole.findById(req.params.id).lean()
      if (!existing) return res.status(404).json({ message: 'Pothole report not found.' })
      if (existing.reportedBy.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'You cannot upvote your own pothole report.' })
      }
      if (existing.upvotes?.some((userId) => userId.toString() === req.user._id.toString())) {
        return res.status(409).json({ message: 'You have already upvoted this pothole.' })
      }
      return res.status(400).json({ message: 'This pothole could not be upvoted.' })
    }

    await Promise.all([
      awardPoints({
        userId: req.user._id,
        amount: 1,
        reason: 'upvote',
        eventKey: `report:${report._id}:voter:${req.user._id}`,
      }),
      awardPoints({
        userId: report.reportedBy._id,
        amount: 2,
        reason: 'report_upvoted',
        eventKey: `report:${report._id}:upvote-reward:${req.user._id}`,
      }),
    ])
    await awardBadgesForUser(report.reportedBy._id)
    if ([5, 10, 25].includes(report.upvoteCount)) {
      await createNotification({
        user: report.reportedBy._id,
        type: 'upvote_milestone',
        message: `Your pothole report reached ${report.upvoteCount} upvotes.`,
        reportId: report._id,
        eventKey: `report:${report._id}:upvotes:${report.upvoteCount}`,
      })
    }
    return res.json({
      message: 'Upvote added. You earned 1 point, and the reporter earned 2 points.',
      report: serializeReport(req, report),
      pointsAwarded: 1,
      reporterPointsAwarded: 2,
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Pothole report id is invalid.' })
    }
    return next(error)
  }
}

export async function changeReportStatus(req, res, next) {
  try {
    const { status, note, afterPhotoUrl } = req.body ?? {}
    if (typeof status !== 'string' || !REPORT_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${REPORT_STATUSES.join(', ')}.`,
      })
    }
    if (note !== undefined && (typeof note !== 'string' || note.trim().length > 500)) {
      return res.status(400).json({ message: 'Note must be 500 characters or fewer.' })
    }
    const cleanNote = typeof note === 'string' ? note.trim() : ''
    if (['fixed', 'rejected'].includes(status) && !cleanNote) {
      return res.status(400).json({ message: `A note is required when a report is ${status}.` })
    }
    if (afterPhotoUrl !== undefined) {
      if (
        typeof afterPhotoUrl !== 'string' ||
        afterPhotoUrl.length > 2048 ||
        !(afterPhotoUrl.startsWith('/uploads/') || /^https?:\/\//i.test(afterPhotoUrl))
      ) {
        return res.status(400).json({
          message: 'After photo must be an /uploads/ path or an HTTP(S) URL.',
        })
      }
      if (status !== 'fixed') {
        return res.status(400).json({ message: 'An after photo can only be added when marking a report fixed.' })
      }
    }

    const current = await Pothole.findById(req.params.id).lean()
    if (!current) return res.status(404).json({ message: 'Pothole report not found.' })
    if (!STATUS_TRANSITIONS[current.status]?.includes(status)) {
      return res.status(400).json({
        message: `A report cannot move from "${current.status}" to "${status}".`,
      })
    }

    const changedAt = new Date()
    const update = {
      $set: { status },
      $push: {
        statusHistory: {
          from: current.status,
          to: status,
          changedBy: req.user._id,
          note: cleanNote,
          at: changedAt,
        },
      },
    }
    if (status === 'fixed') {
      update.$set.fixedAt = changedAt
      update.$set.fixBonusAwarded = true
    }
    if (afterPhotoUrl) update.$set.afterPhotoUrl = afterPhotoUrl

    const report = await Pothole.findOneAndUpdate(
      { _id: current._id, status: current.status },
      update,
      { returnDocument: 'after', runValidators: true },
    )
      .populate('reportedBy', 'name badges')
      .populate('statusHistory.changedBy', 'name')
      .lean()
    if (!report) {
      return res.status(409).json({ message: 'This report changed while you were updating it. Reload and try again.' })
    }

    let bonusPointsAwarded = 0
    if (status === 'fixed' && !current.fixBonusAwarded) {
      const awarded = await awardPoints({
        userId: current.reportedBy,
        amount: FIXED_REPORTER_BONUS_POINTS,
        reason: 'report_fixed',
        eventKey: `report:${current._id}:fixed-reward`,
      })
      if (awarded) bonusPointsAwarded = FIXED_REPORTER_BONUS_POINTS
    }
    await awardBadgesForUser(current.reportedBy)

    const historyEntry = report.statusHistory.at(-1)
    await createNotification({
      user: current.reportedBy,
      type: 'status_changed',
      message: `Your pothole report status changed to ${status.replace('_', ' ')}.`,
      reportId: report._id,
      eventKey: `report:${report._id}:status:${historyEntry?._id ?? changedAt.getTime()}`,
    })

    return res.json({
      message: 'Pothole report status updated.',
      report: serializeReport(req, report),
      bonusPointsAwarded,
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Pothole report id is invalid.' })
    }
    return next(error)
  }
}

export async function removeUpvote(req, res, next) {
  try {
    const report = await Pothole.findOneAndUpdate(
      { _id: req.params.id, upvotes: req.user._id },
      {
        $pull: { upvotes: req.user._id },
        $inc: { upvoteCount: -1 },
      },
      { returnDocument: 'after' },
    )
      .populate('reportedBy', 'name badges')
      .lean()

    if (!report) {
      const existing = await Pothole.exists({ _id: req.params.id })
      if (!existing) return res.status(404).json({ message: 'Pothole report not found.' })
      return res.status(409).json({ message: 'You have not upvoted this pothole.' })
    }

    return res.json({
      message: 'Your upvote was removed. Earned points are not taken back.',
      report: serializeReport(req, report),
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Pothole report id is invalid.' })
    }
    return next(error)
  }
}

export async function getStats(req, res, next) {
  try {
    const now = new Date()
    const [stats] = await Pothole.aggregate([
      { $match: { seeded: { $ne: true } } },
      {
        $facet: {
          open: [
            { $match: { status: { $in: ['reported', 'verified', 'in_progress'] } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                averageDaysOpen: { $avg: { $divide: [{ $subtract: [now, '$createdAt'] }, DAY_MS] } },
                slaBreaches: {
                  $sum: {
                    $cond: [
                      {
                        $gt: [
                          { $divide: [{ $subtract: [now, '$createdAt'] }, DAY_MS] },
                          {
                            $switch: {
                              branches: [
                                { case: { $gte: ['$ai.severity', 4] }, then: SLA_DAYS.high },
                                { case: { $eq: ['$ai.severity', 3] }, then: SLA_DAYS.medium },
                              ],
                              default: SLA_DAYS.low,
                            },
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          finished: [
            { $match: { status: { $in: ['fixed', 'rejected'] } } },
            { $group: { _id: null, total: { $sum: 1 }, fixed: { $sum: { $cond: [{ $eq: ['$status', 'fixed'] }, 1, 0] } } } },
          ],
          timeToFix: [
            { $match: { status: 'fixed', fixedAt: { $type: 'date' } } },
            { $group: { _id: null, average: { $avg: { $divide: [{ $subtract: ['$fixedAt', '$createdAt'] }, DAY_MS] } } } },
          ],
          oldest: [
            { $match: { status: { $in: ['reported', 'verified', 'in_progress'] } } },
            { $sort: { createdAt: 1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                photoUrl: 1,
                daysOpen: {
                  $max: [
                    0,
                    { $floor: { $divide: [{ $subtract: [now, '$createdAt'] }, DAY_MS] } },
                  ],
                },
                severity: {
                  $cond: ['$ai.checked', '$ai.severity', null],
                },
              },
            },
          ],
        },
      },
    ])
    const open = stats?.open?.[0]
    const finished = stats?.finished?.[0]
    const totalReports = (open?.total ?? 0) + (finished?.total ?? 0)
    return res.json({
      totalReported: open?.total ?? 0,
      totalFixed: finished?.fixed ?? 0,
      percentFixed: totalReports ? Math.round(((finished?.fixed ?? 0) / totalReports) * 1000) / 10 : 0,
      averageDaysOpen: open?.averageDaysOpen
        ? Math.round(open.averageDaysOpen * 10) / 10
        : 0,
      averageDaysToFix: stats?.timeToFix?.[0]?.average
        ? Math.round(stats.timeToFix[0].average * 10) / 10
        : 0,
      slaBreaches: open?.slaBreaches ?? 0,
      oldestUnfixed: (stats?.oldest ?? []).map((report) => ({
        ...report,
        photoUrl: absolutePhotoUrl(req, report),
      })),
    })
  } catch (error) {
    return next(error)
  }
}
