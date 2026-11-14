import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { BADGE_RULES } from '../config/badges.js'

const pointsHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    maxlength: 80,
  },
  eventKey: {
    type: String,
    required: true,
    maxlength: 160,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false })

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required.'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters.'],
    maxlength: [80, 'Name must be 80 characters or fewer.'],
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [254, 'Email must be 254 characters or fewer.'],
  },
  password: {
    type: String,
    required: [true, 'Password is required.'],
    minlength: [8, 'Password must be at least 8 characters.'],
    maxlength: [72, 'Password must be 72 characters or fewer.'],
    select: false,
  },
  role: {
    type: String,
    enum: ['citizen', 'authority', 'admin'],
    default: 'citizen',
  },
  points: {
    type: Number,
    default: 0,
    min: 0,
  },
  pointsHistory: {
    type: [pointsHistorySchema],
    default: [],
    select: false,
  },
  badges: {
    type: [{
      type: String,
      enum: BADGE_RULES.map((badge) => badge.key),
    }],
    default: [],
  },
  seeded: {
    type: Boolean,
    default: false,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password)
}

const User = mongoose.model('User', userSchema)

export default User
