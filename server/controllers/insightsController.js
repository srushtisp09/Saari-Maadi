import User from '../models/User.js'
import Pothole from '../models/Pothole.js'
import { getBadgeDetails } from '../config/badges.js'
import { SLA_DAYS } from '../config/sla.js'
import { awardBadgesForUser } from '../services/badges.js'
import { getLeaderboard } from '../services/leaderboard.js'
import { createTtlCache } from '../services/ttlCache.js'
import { isDemoMode } from '../config/env.js'

const DAY_MS = 24 * 60 * 60 * 1000
const OPEN_STATUSES = ['reported', 'verified', 'in_progress']
const cityReportCache = createTtlCache(30_000)
const reportVisibilityFilter = isDemoMode() ? {} : { seeded: { $ne: true } }

function absolutePhotoUrl(req, photoUrl) {
  if (!photoUrl || /^https?:\/\//i.test(photoUrl)) return photoUrl
  const origin = `${req.protocol}://${req.get('host')}`
  return `${origin}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`
}

function roundToOneDecimal(value) {
  return Math.round((value || 0) * 10) / 10
}

export async function getLeaderboardPage(req, res, next) {
  try {
    const { period, page, limit } = req.validated.query

    if (req.user?.role === 'citizen') await awardBadgesForUser(req.user._id)
    const result = await getLeaderboard(period, req.user?._id, { page, limit })
    return res.json({
      ...result,
      currentUserRank: result.currentUser?.rank ?? null,
    })
  } catch (error) {
    return next(error)
  }
}

export async function getProfile(req, res, next) {
  try {
    const { page, limit } = req.validated.query
    await awardBadgesForUser(req.user._id)
    const [user, reports, totalReports, leaderboard] = await Promise.all([
      User.findById(req.user._id).select('name email role points badges createdAt').lean(),
      Pothole.find({ reportedBy: req.user._id, ...reportVisibilityFilter })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('statusHistory.changedBy', 'name')
        .lean(),
      Pothole.countDocuments({ reportedBy: req.user._id, ...reportVisibilityFilter }),
      getLeaderboard('all-time', req.user._id),
    ])

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        badges: getBadgeDetails(user.badges),
        createdAt: user.createdAt,
        rank: leaderboard.currentUser?.rank ?? null,
      },
      reports: reports.map((report) => ({
        id: report._id.toString(),
        photoUrl: absolutePhotoUrl(req, report.photoUrl),
        description: report.description || '',
        address: report.address || '',
        status: report.status,
        severity: report.ai?.checked ? report.ai.severity : null,
        upvoteCount: report.upvoteCount ?? report.upvotes?.length ?? 0,
        createdAt: report.createdAt,
        fixedAt: report.fixedAt,
        statusHistory: report.statusHistory || [],
      })),
      pagination: {
        page,
        limit,
        total: totalReports,
        pages: Math.ceil(totalReports / limit),
        hasMore: page * limit < totalReports,
      },
    })
  } catch (error) {
    return next(error)
  }
}

export async function getAnalytics(req, res, next) {
  try {
    const { page, limit } = req.validated.query
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)
    const [analytics = {}] = await Pothole.aggregate([
      { $match: reportVisibilityFilter },
      {
        $facet: {
          reportsByStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
          ],
          reportsOverTime: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt',
                    timezone: 'UTC',
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', count: 1 } },
          ],
          averageDaysToFixBySeverity: [
            { $match: { status: 'fixed', fixedAt: { $type: 'date' } } },
            {
              $group: {
                _id: { $cond: ['$ai.checked', '$ai.severity', null] },
                averageDays: {
                  $avg: { $divide: [{ $subtract: ['$fixedAt', '$createdAt'] }, DAY_MS] },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                _id: 0,
                severity: '$_id',
                averageDays: { $round: ['$averageDays', 1] },
                count: 1,
              },
            },
          ],
          sla: [
            { $match: { status: { $in: OPEN_STATUSES } } },
            {
              $addFields: {
                _elapsedDays: { $divide: [{ $subtract: [now, '$createdAt'] }, DAY_MS] },
                _slaDays: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $and: [
                            { $eq: ['$ai.checked', true] },
                            { $gte: ['$ai.severity', 4] },
                          ],
                        },
                        then: SLA_DAYS.high,
                      },
                      {
                        case: {
                          $and: [
                            { $eq: ['$ai.checked', true] },
                            { $eq: ['$ai.severity', 3] },
                          ],
                        },
                        then: SLA_DAYS.medium,
                      },
                    ],
                    default: SLA_DAYS.low,
                  },
                },
              },
            },
            {
              $group: {
                _id: null,
                openReports: { $sum: 1 },
                breachedReports: { $sum: { $cond: [{ $gt: ['$_elapsedDays', '$_slaDays'] }, 1, 0] } },
              },
            },
          ],
          hotspots: [
            {
              $match: {
                'location.coordinates.0': { $type: 'number' },
                'location.coordinates.1': { $type: 'number' },
              },
            },
            {
              $group: {
                _id: {
                  longitude: {
                    $round: [{ $multiply: [{ $arrayElemAt: ['$location.coordinates', 0] }, 100] }, 0],
                  },
                  latitude: {
                    $round: [{ $multiply: [{ $arrayElemAt: ['$location.coordinates', 1] }, 100] }, 0],
                  },
                },
                reportCount: { $sum: 1 },
                openReports: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
              },
            },
            { $sort: { reportCount: -1 } },
            { $limit: 40 },
            {
              $project: {
                _id: 0,
                longitude: { $divide: ['$_id.longitude', 100] },
                latitude: { $divide: ['$_id.latitude', 100] },
                reportCount: 1,
                openReports: 1,
              },
            },
          ],
          hotspotAreas: [
            { $match: { status: { $in: OPEN_STATUSES } } },
            {
              $group: {
                _id: { $ifNull: ['$address', 'Area not specified'] },
                openReports: { $sum: 1 },
                totalReports: { $sum: 1 },
              },
            },
            { $sort: { openReports: -1, _id: 1 } },
            { $limit: 8 },
            { $project: { _id: 0, area: '$_id', openReports: 1, totalReports: 1 } },
          ],
          reports: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: User.collection.name,
                let: { reporterId: '$reportedBy' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$reporterId'] } } },
                  { $project: { name: 1 } },
                ],
                as: 'reporterInfo',
              },
            },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                photoUrl: 1,
                description: 1,
                address: 1,
                status: 1,
                severity: { $cond: ['$ai.checked', '$ai.severity', null] },
                upvoteCount: { $ifNull: ['$upvoteCount', { $size: { $ifNull: ['$upvotes', []] } }] },
                createdAt: 1,
                reportedBy: { $ifNull: [{ $arrayElemAt: ['$reporterInfo.name', 0] }, 'Community member'] },
              },
            },
          ],
          reportCount: [{ $count: 'total' }],
        },
      },
    ])

    const sla = analytics.sla?.[0]
    const openReports = sla?.openReports ?? 0
    const breachedReports = sla?.breachedReports ?? 0
    return res.json({
      generatedAt: now,
      reportsByStatus: analytics.reportsByStatus || [],
      reportsOverTime: analytics.reportsOverTime || [],
      averageDaysToFixBySeverity: analytics.averageDaysToFixBySeverity || [],
      sla: {
        openReports,
        breachedReports,
        compliancePercent: openReports
          ? Math.round(((openReports - breachedReports) / openReports) * 1000) / 10
          : 100,
      },
      hotspots: (analytics.hotspots || []).map((spot) => ({
        ...spot,
        lat: spot.latitude,
        lng: spot.longitude,
      })),
      hotspotAreas: analytics.hotspotAreas || [],
      reports: (analytics.reports || []).map((report) => ({
        ...report,
        photoUrl: absolutePhotoUrl(req, report.photoUrl),
      })),
      reportPagination: {
        page,
        limit,
        total: analytics.reportCount?.[0]?.total ?? 0,
        pages: Math.ceil((analytics.reportCount?.[0]?.total ?? 0) / limit),
      },
    })
  } catch (error) {
    return next(error)
  }
}

export async function getCityReport(req, res, next) {
  try {
    const cachedReportCard = cityReportCache.get()
    if (cachedReportCard) {
      return res.set('Cache-Control', 'public, max-age=30').json(cachedReportCard)
    }

    const [reportCard = {}] = await Pothole.aggregate([
      { $match: reportVisibilityFilter },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalReported: { $sum: 1 },
                totalFixed: { $sum: { $cond: [{ $eq: ['$status', 'fixed'] }, 1, 0] } },
              },
            },
          ],
          fixTime: [
            { $match: { status: 'fixed', fixedAt: { $type: 'date' } } },
            {
              $group: {
                _id: null,
                averageDays: {
                  $avg: { $divide: [{ $subtract: ['$fixedAt', '$createdAt'] }, DAY_MS] },
                },
              },
            },
          ],
          worstAreas: [
            { $match: { status: { $in: OPEN_STATUSES } } },
            {
              $group: {
                _id: { $ifNull: ['$address', 'Area not specified'] },
                openReports: { $sum: 1 },
              },
            },
            { $sort: { openReports: -1, _id: 1 } },
            { $limit: 5 },
            { $project: { _id: 0, area: '$_id', openReports: 1 } },
          ],
          topContributors: [
            {
              $group: {
                _id: '$reportedBy',
                reports: { $sum: 1 },
                fixedReports: { $sum: { $cond: [{ $eq: ['$status', 'fixed'] }, 1, 0] } },
              },
            },
            {
              $lookup: {
                from: User.collection.name,
                let: { reporterId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$_id', '$$reporterId'] },
                          ...(isDemoMode() ? [] : [{ $ne: ['$seeded', true] }]),
                        ],
                      },
                    },
                  },
                  { $project: { name: 1, points: 1, badges: 1 } },
                ],
                as: 'contributor',
              },
            },
            { $unwind: '$contributor' },
            { $sort: { reports: -1, 'contributor.points': -1, _id: 1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                name: '$contributor.name',
                points: '$contributor.points',
                badges: '$contributor.badges',
                reports: 1,
                fixedReports: 1,
              },
            },
          ],
        },
      },
    ])

    const totals = reportCard.totals?.[0] || { totalReported: 0, totalFixed: 0 }
    const response = {
      totalReported: totals.totalReported,
      totalFixed: totals.totalFixed,
      percentFixed: totals.totalReported
        ? Math.round((totals.totalFixed / totals.totalReported) * 1000) / 10
        : 0,
      averageDaysToFix: roundToOneDecimal(reportCard.fixTime?.[0]?.averageDays),
      worstAreas: reportCard.worstAreas || [],
      topContributors: (reportCard.topContributors || []).map((contributor) => ({
        ...contributor,
        badges: getBadgeDetails(contributor.badges),
      })),
      generatedAt: new Date(),
    }
    cityReportCache.set(response)
    return res.set('Cache-Control', 'public, max-age=30').json(response)
  } catch (error) {
    return next(error)
  }
}
