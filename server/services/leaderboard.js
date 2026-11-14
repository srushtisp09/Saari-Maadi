import mongoose from 'mongoose'
import User from '../models/User.js'
import { getBadgeDetails } from '../config/badges.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function getLeaderboard(period, currentUserId) {
  const weekly = period === 'weekly'
  const pipeline = [
    { $match: { role: 'citizen', seeded: { $ne: true } } },
    {
      $addFields: {
        leaderboardPoints: weekly
          ? {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ['$pointsHistory', []] },
                      as: 'entry',
                      cond: { $gte: ['$$entry.createdAt', new Date(Date.now() - WEEK_MS)] },
                    },
                  },
                  as: 'entry',
                  in: '$$entry.amount',
                },
              },
            }
          : { $ifNull: ['$points', 0] },
      },
    },
    {
      $setWindowFields: {
        sortBy: { leaderboardPoints: -1 },
        output: { rank: { $rank: {} } },
      },
    },
    { $sort: { leaderboardPoints: -1, name: 1, _id: 1 } },
    {
      $facet: {
        leaders: [
          { $limit: 10 },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              name: 1,
              badges: 1,
              points: '$leaderboardPoints',
              rank: 1,
            },
          },
        ],
        currentUser: currentUserId
          ? [
              { $match: { _id: new mongoose.Types.ObjectId(currentUserId) } },
              {
                $project: {
                  _id: 0,
                  id: { $toString: '$_id' },
                  name: 1,
                  badges: 1,
                  points: '$leaderboardPoints',
                  rank: 1,
                },
              },
            ]
          : [{ $limit: 0 }],
      },
    },
  ]

  const [result = { leaders: [], currentUser: [] }] = await User.aggregate(pipeline)
  return {
    leaders: result.leaders.map((user) => ({ ...user, badges: getBadgeDetails(user.badges) })),
    currentUser: result.currentUser[0]
      ? {
          ...result.currentUser[0],
          badges: getBadgeDetails(result.currentUser[0].badges),
        }
      : null,
    period,
  }
}
