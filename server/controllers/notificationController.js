import Notification from '../models/Notification.js'

export async function listNotifications(req, res, next) {
  try {
    const { page, limit } = req.validated.query
    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reportId', '_id'),
      Notification.countDocuments({ user: req.user._id, read: false }),
      Notification.countDocuments({ user: req.user._id }),
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
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
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
