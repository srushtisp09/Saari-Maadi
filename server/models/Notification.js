import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['status_changed', 'upvote_milestone'],
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 300,
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pothole',
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  eventKey: {
    type: String,
    unique: true,
    sparse: true,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

notificationSchema.index({ user: 1, createdAt: -1 })

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
