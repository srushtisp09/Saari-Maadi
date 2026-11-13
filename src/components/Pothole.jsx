import { motion } from 'framer-motion'

export default function Pothole({ isHit }) {
  return (
    <div className="pothole-wrap" aria-hidden="true">
      {isHit && (
        <motion.div
          className="dust-cloud"
          initial={{ opacity: 0, scale: 0.45, y: 12 }}
          animate={{ opacity: [0, 0.95, 0], scale: [0.45, 1.15, 1.5], y: [12, -9, -24] }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <i />
          <i />
          <i />
          <i />
          <i />
        </motion.div>
      )}
      <svg className="pothole-art" viewBox="0 0 220 70">
        <ellipse cx="110" cy="42" rx="106" ry="25" fill="#34312c" />
        <path
          d="M12 41c13-18 36-26 67-28 37-3 74 1 101 12 16 7 25 14 28 21-16 12-55 18-99 18-42 0-80-6-97-15Z"
          fill="#211f1c"
        />
        <path
          d="M33 37c22-12 45-17 73-16 26 1 52 5 72 13-27 4-49 10-74 10-28 0-49-2-71-7Z"
          fill="#45413a"
        />
        <path d="m52 36 15-8 9 2-12 9Zm88-9 13 3-9 5-12-2Z" fill="#59544b" />
      </svg>
    </div>
  )
}
