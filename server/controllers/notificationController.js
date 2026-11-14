import Notification from '../models/Notification.js'

export async function listNotifications(req, res, next) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('reportId', '_id'),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ])

    return res.json({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        reportId: notification.reportId?._id?.toString() ?? notification.reportId?.toString(),
        read: notification.read,
        createdAt: notification.createdAt,
      })),
      unreadCount,
    })
  } catch (error) {
    return next(error)
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } },
    )
    return res.json({ message: 'All notifications marked as read.', updated: result.modifiedCount })
  } catch (error) {
    return next(error)
  }
}
