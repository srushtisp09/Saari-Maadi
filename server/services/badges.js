import Pothole from '../models/Pothole.js'
import User from '../models/User.js'
import { BADGE_RULES } from '../config/badges.js'
import { isDemoMode } from '../config/env.js'

export async function awardBadgesForUser(userId) {
  const [counts] = await Pothole.aggregate([
    { $match: { reportedBy: userId, ...(isDemoMode() ? {} : { seeded: { $ne: true } }) } },
    {
      $group: {
        _id: null,
        reports: { $sum: 1 },
        fixedReports: { $sum: { $cond: [{ $eq: ['$status', 'fixed'] }, 1, 0] } },
        upvotesReceived: {
          $sum: {
            $ifNull: ['$upvoteCount', { $size: { $ifNull: ['$upvotes', []] } }],
          },
        },
      },
    },
  ])
  const metrics = counts || { reports: 0, fixedReports: 0, upvotesReceived: 0 }

  await Promise.all(BADGE_RULES
    .filter((badge) => metrics[badge.metric] >= badge.threshold)
    .map((badge) => User.updateOne(
      { _id: userId, badges: { $ne: badge.key } },
      { $addToSet: { badges: badge.key } },
    )))

  return User.findById(userId).select('badges').lean()
}
