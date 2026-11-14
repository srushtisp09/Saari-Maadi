import User from '../models/User.js'

export async function awardPoints({ userId, amount, reason, eventKey }) {
  const result = await User.updateOne(
    { _id: userId, 'pointsHistory.eventKey': { $ne: eventKey } },
    {
      $inc: { points: amount },
      $push: {
        pointsHistory: {
          amount,
          reason,
          eventKey,
          createdAt: new Date(),
        },
      },
    },
  )

  return result.modifiedCount === 1
}
