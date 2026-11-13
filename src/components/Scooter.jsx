import { motion } from 'framer-motion'

export default function Scooter({ phase }) {
  const animation =
    phase === 'ride'
      ? { x: 0, y: 0, rotate: 0 }
      : phase === 'bump'
        ? {
            x: [0, -7, 9, -5, 0],
            y: [0, -25, 2, -8, 0],
            rotate: [0, -7, 5, -3, 0],
          }
        : { x: 0, y: 0, rotate: 0 }

  return (
    <motion.div
      className="scooter-rider"
      initial={{ x: '-110vw', y: 0, rotate: 0 }}
      animate={animation}
      transition={
        phase === 'ride'
          ? { x: { duration: 3.2, ease: [0.2, 0.72, 0.25, 1] }, y: { duration: 3.2 }, rotate: { duration: 3.2 } }
          : phase === 'bump'
            ? { duration: 0.82, ease: 'easeOut' }
            : { duration: 0.2 }
      }
      aria-hidden="true"
    >
      <svg viewBox="0 0 280 210" className="scooter-art">
        <ellipse cx="147" cy="190" rx="115" ry="9" fill="#302e29" opacity=".22" />
        <circle cx="73" cy="159" r="29" fill="#292824" />
        <circle cx="73" cy="159" r="14" fill="#e9ddbd" />
        <circle cx="222" cy="159" r="29" fill="#292824" />
        <circle cx="222" cy="159" r="14" fill="#e9ddbd" />
        <path
          d="M75 145 99 119h51l30 19 39 5 12 12-8 8h-18a29 29 0 0 0-56 0h-47a29 29 0 0 0-56-1l-9-5 8-11Z"
          fill="#c1272d"
          stroke="#802328"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="m113 119 13-27h45l17 48h-31l-24-21Z" fill="#f4b400" />
        <path d="m105 116 5-13h34l-8 16Z" fill="#35332e" />
        <path d="m151 91-4-10h31l6 10" fill="none" stroke="#35332e" strokeWidth="5" />
        <path d="m189 138 28-4 9 8-20 4Z" fill="#fff3d3" />
        <path d="m198 118 26-23 13 2-16 26" fill="none" stroke="#34312c" strokeWidth="5" strokeLinecap="round" />
        <circle cx="222" cy="94" r="5" fill="#34312c" />
        <path d="m130 88 8-34 34-13 25 9 12 26-10 34-31 13-28-13Z" fill="#315c41" />
        <path d="m135 69 5-25 23-19 23 5 14 19-4 19Z" fill="#c1272d" />
        <path d="m160 37 2-13 18 2 7 11Z" fill="#f4b400" />
        <path d="m135 82-25 22 17 10 24-23m48 4 15 13-9 9-21-9" fill="#315c41" stroke="#253e30" strokeWidth="5" strokeLinejoin="round" />
        <path d="m110 104-12 14m92-31 15 2" fill="none" stroke="#e8c89a" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </motion.div>
  )
}
