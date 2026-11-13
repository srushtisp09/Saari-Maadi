import mongoose from 'mongoose'

const potholeSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  photoUrl: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Description must be 300 characters or fewer.'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coordinates) =>
          coordinates.length === 2 &&
          coordinates.every(Number.isFinite) &&
          coordinates[0] >= -180 &&
          coordinates[0] <= 180 &&
          coordinates[1] >= -90 &&
          coordinates[1] <= 90,
        message: 'Location must contain valid [longitude, latitude] coordinates.',
      },
    },
  },
  address: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['reported', 'fixed'],
    default: 'reported',
  },
  seeded: {
    type: Boolean,
    default: false,
    select: false,
  },
  ai: {
    checked: { type: Boolean, default: false },
    isPothole: { type: Boolean, default: false },
    severity: { type: Number, min: 1, max: 5, default: null },
    confidence: { type: Number, min: 0, max: 1, default: null },
    reason: { type: String, trim: true, maxlength: 300, default: '' },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

potholeSchema.index({ location: '2dsphere' })
potholeSchema.index({ createdAt: -1 })

const Pothole = mongoose.model('Pothole', potholeSchema)

export default Pothole
