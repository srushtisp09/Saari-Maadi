import Notification from '../models/Notification.js'

export async function createNotification({
  user,
  type,
  message,
  reportId,
  eventKey,
}) {
  const notification = await Notification.findOneAndUpdate(
    { eventKey },
    {
      $setOnInsert: {
        user,
        type,
        message,
        reportId,
        eventKey,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )
  return notification
}
