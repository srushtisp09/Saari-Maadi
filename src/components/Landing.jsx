import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Home from './Home.jsx'
import Pothole from './Pothole.jsx'
import Scooter from './Scooter.jsx'

function StreetScene() {
  return (
    <svg
      className="street-scene"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <rect width="1440" height="900" fill="#fff8e7" />
      <circle cx="1190" cy="145" r="56" fill="#f4b400" opacity=".72" />
      <path d="M0 538c153-39 261-36 384-6 166 41 282 40 441 0 195-49 384-28 615 16v117H0Z" fill="#d5ddbc" />
      <path d="M0 577c180-32 331-23 492 8 163 31 293 7 456-19 174-27 308-7 492 29v70H0Z" fill="#a9bf91" />

      <g className="mobile-coconut">
        <path d="M473 615c7-100 10-195 4-294" fill="none" stroke="#765c39" strokeWidth="13" />
        <path d="M478 329c-38-44-78-63-129-63 48-15 93 0 133 36-20-45-14-86 7-124 0 43 7 80 0 124 31-43 70-63 121-59-46 14-83 39-117 79 42-24 84-26 128-7-49-2-88 10-129 39Z" fill="#547d4f" stroke="#1b5e3a" strokeWidth="4" />
      </g>
      <g className="mobile-auto" transform="translate(913 527) scale(.6)">
        <ellipse cx="82" cy="90" rx="102" ry="10" fill="#3c3a32" opacity=".18" />
        <circle cx="36" cy="82" r="16" fill="#302e29" />
        <circle cx="136" cy="82" r="16" fill="#302e29" />
        <path d="m9 73 13-55 27-17h69l28 28 13 44-19 13H24Z" fill="#1b5e3a" stroke="#17462d" strokeWidth="4" />
        <path d="m51 5-17 37h67V5Z" fill="#d6e0bf" stroke="#17462d" strokeWidth="4" />
        <path d="M109 5v38h37l-28-38Z" fill="#f4b400" />
        <path d="m33 48 101 1 11 22H24Z" fill="#c1272d" />
        <path d="M70 48h13v23H70z" fill="#fff8e7" />
      </g>

      <g fill="#e9d39d" stroke="#876f47" strokeWidth="5" strokeLinejoin="round">
        <path d="M465 587V416h50v-35h79v35h49V324h60v-40h76v40h63v263Z" />
        <path d="M443 416h75v170h-75zM613 416h80v170h-80zM842 410h100v176H842z" />
        <path d="M684 324h37v-61h28v-34h47v34h28v61h40v263H684Z" />
        <path d="M733 229h80v-34h-15v-24h-50v24h-15z" />
      </g>
      <g fill="#c1272d" opacity=".8">
        <path d="M722 323h18v31h-18zm38 0h18v31h-18zm38 0h18v31h-18zM491 442h14v22h-14zm44 0h14v22h-14zm91 0h14v22h-14zm49 0h14v22h-14zm188 0h14v22h-14zm45 0h14v22h-14z" />
      </g>
      <g fill="#fff8e7">
        <path d="M708 373h24v30h-24zm43 0h24v30h-24zm43 0h24v30h-24zM488 489h18v27h-18zm46 0h18v27h-18zm96 0h18v27h-18zm50 0h18v27h-18zm177 0h18v27h-18zm53 0h18v27h-18z" />
      </g>
      <path d="M765 454h45v132h-45z" fill="#765c39" />
      <path d="M0 597c151-13 249-10 392 10 192 27 340 9 505-8 173-18 338-19 543 1v42H0Z" fill="#71865a" />

      <g className="tree tree-left">
        <path d="M177 606c8-111 8-208 21-300" fill="none" stroke="#765c39" strokeWidth="14" />
        <path d="M190 312C143 270 94 269 52 285c44-34 96-36 144-4-24-50-20-94 4-135 4 48 16 89 4 136 42-49 94-66 151-58-53 16-101 39-147 78 59-21 104-12 148 17-64-10-113-2-166 20Z" fill="#547d4f" stroke="#1b5e3a" strokeWidth="4" />
      </g>
      <g className="tree tree-right">
        <path d="M1262 609c-5-101-12-196-27-280" fill="none" stroke="#765c39" strokeWidth="14" />
        <path d="M1234 331c-37-50-80-77-133-80 51-12 99 5 139 48-18-51-8-99 19-138-4 50 0 93 9 139 28-47 73-76 132-77-53 21-90 55-125 103 47-31 96-34 151-15-62 0-105 15-150 47Z" fill="#547d4f" stroke="#1b5e3a" strokeWidth="4" />
      </g>
      <g className="tree tree-small">
        <path d="M354 605v-131" stroke="#765c39" strokeWidth="9" />
        <path d="M354 476c-29-25-49-31-78-27 23-17 53-16 77 5-12-30-8-52 7-75 0 30 5 49 1 75 20-23 44-33 74-31-30 10-50 24-71 46 27-10 50-7 72 7-34-4-54 1-82 14Z" fill="#638550" />
      </g>

      <g className="auto-rickshaw" transform="translate(1036 515)">
        <ellipse cx="82" cy="90" rx="102" ry="10" fill="#3c3a32" opacity=".18" />
        <circle cx="36" cy="82" r="16" fill="#302e29" />
        <circle cx="136" cy="82" r="16" fill="#302e29" />
        <path d="m9 73 13-55 27-17h69l28 28 13 44-19 13H24Z" fill="#1b5e3a" stroke="#17462d" strokeWidth="4" />
        <path d="m51 5-17 37h67V5Z" fill="#d6e0bf" stroke="#17462d" strokeWidth="4" />
        <path d="M109 5v38h37l-28-38Z" fill="#f4b400" />
        <path d="m33 48 101 1 11 22H24Z" fill="#c1272d" />
        <path d="M70 48h13v23H70z" fill="#fff8e7" />
        <path d="m3 55 18 3-4 13H4z" fill="#f4b400" />
      </g>

      <path d="M0 638c277-18 444-10 720 0 275 10 463 9 720-1v263H0Z" fill="#45413a" />
      <path d="M0 649c273-12 463-4 720 3 275 8 461 6 720-3" fill="none" stroke="#c6a86a" strokeWidth="8" opacity=".8" />
      <path d="M0 661c300-15 445-5 720 3 259 7 492 8 720-3" fill="none" stroke="#fff8e7" strokeWidth="3" opacity=".45" />
    </svg>
  )
}

export default function Landing({ onComplete, onSkip }) {
  const [phase, setPhase] = useState('ride')

  useEffect(() => {
    if (phase === 'ride') {
      const timer = window.setTimeout(() => setPhase('bump'), 3300)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'bump') {
      const timer = window.setTimeout(() => setPhase('reveal'), 900)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'reveal') {
      const timer = window.setTimeout(onComplete, 1250)
      return () => window.clearTimeout(timer)
    }
  }, [onComplete, phase])

  return (
    <main className="landing-screen relative min-h-svh overflow-hidden bg-[#fff8e7]" aria-label="Sari Maadi intro animation">
      <motion.div
        className="scenery-layer absolute inset-0"
        animate={{ x: phase === 'ride' ? ['0%', '-1.5%'] : '-1.5%' }}
        transition={{ duration: 3.2, ease: 'linear' }}
      >
        <StreetScene />
      </motion.div>

      <div className={`speed-lines ${phase === 'ride' || phase === 'bump' ? 'is-moving' : ''}`} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="road-markings" aria-hidden="true" />

      <Pothole isHit={phase === 'bump' || phase === 'reveal'} />
      <Scooter phase={phase} />

      {phase === 'bump' && (
        <motion.div
          className="dhapp-pop font-baloo"
          initial={{ opacity: 0, scale: 0.35, rotate: -14, y: 20 }}
          animate={{ opacity: 1, scale: [0.35, 1.2, 1], rotate: [-14, 8, 0], y: [20, -8, 0] }}
          transition={{ duration: 0.45, ease: 'backOut' }}
          aria-hidden="true"
        >
          Dhapp!
        </motion.div>
      )}

      <div className="intro-brand pointer-events-none absolute left-6 top-6 z-30 flex items-center gap-3 sm:left-10 sm:top-8">
        <span className="brand-mark" aria-hidden="true">ಸ</span>
        <span className="font-baloo text-xl font-extrabold text-[#1b5e3a] sm:text-2xl">
          Sari Maadi
        </span>
      </div>
      <button type="button" className="skip-button absolute right-5 top-5 z-40 sm:right-8 sm:top-7" onClick={onSkip}>
        Skip <span aria-hidden="true">→</span>
      </button>

      {phase === 'reveal' && (
        <motion.div
          className="home-reveal fixed inset-0 z-50"
          initial={{ clipPath: 'circle(0% at 54% 83%)' }}
          animate={{ clipPath: 'circle(150% at 54% 83%)' }}
          transition={{ duration: 1.15, ease: [0.76, 0, 0.24, 1] }}
        >
          <Home />
        </motion.div>
      )}
    </main>
  )
}
