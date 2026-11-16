import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid pothole report id is required.')
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
}

export const registerBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
}).strict()

export const loginBody = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
}).strict()

export const reportListQuery = z.object({
  ...pagination,
  status: z.enum(['reported', 'verified', 'in_progress', 'fixed', 'rejected']).optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  mine: z.enum(['true', 'false']).optional(),
  area: z.string().trim().max(100).optional(),
  sort: z.enum(['priority']).optional(),
}).strict()

export const nearbyQuery = z.object({
  lat: z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-90).max(90)),
  lng: z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-180).max(180)),
  radius: z.coerce.number().int().min(1).max(5000).default(500),
  ...pagination,
}).strict()

export const reportBody = z.object({
  lat: z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-90).max(90)),
  lng: z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-180).max(180)),
  description: z.string().trim().max(300).optional(),
  forceNew: z.enum(['true', 'false']).optional(),
}).strict()

export const reportIdParams = z.object({ id: objectId }).strict()

export const statusBody = z.object({
  status: z.enum(['reported', 'verified', 'in_progress', 'fixed', 'rejected']),
  note: z.string().trim().max(500).optional(),
  afterPhotoUrl: z.string().trim().max(2048).refine(
    (value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
    'After photo must be an /uploads/ path or an HTTP(S) URL.',
  ).optional(),
}).strict()

export const leaderboardQuery = z.object({
  period: z.enum(['weekly', 'all-time']).default('all-time'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict()

export const notificationsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict()

export const profileQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict()

export const analyticsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
}).strict()

export const emptyBody = z.preprocess(
  (value) => value === undefined ? {} : value,
  z.object({}).strict(),
)
