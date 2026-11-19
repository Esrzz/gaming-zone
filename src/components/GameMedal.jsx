import { useId } from 'react'
import GameIcon from './GameIcon.jsx'

export const TIER_LABEL = { gold: 'Oro', silver: 'Plata', bronze: 'Bronce' }
export const RANK_LABEL = { 1: 'Master', 2: '2.º puesto', 3: '3.er puesto' }

// Rama de laurel de un lado, de abajo hacia arriba (el otro lado es su espejo).
// Dos hileras de hojas inclinadas hacia afuera y hacia adentro, como una rama real.
const CX = 50
const CY = 55
const R = 35
const STEPS = 8
const A0 = 100
const A1 = 214
const LEAVES = Array.from({ length: STEPS * 2 }, (_, n) => {
  const i = n >> 1
  const outer = n % 2 === 0
  const t = i / (STEPS - 1)
  const a = A0 + t * (A1 - A0)
  const rad = (a * Math.PI) / 180
  const r = R + (outer ? 3 : -3)
  return {
    x: CX - r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
    rot: -a + (outer ? 38 : -38),
    k: (1 - t * 0.3) * (outer ? 1.05 : 0.9), // se achican hacia la punta
  }
})
const STEM = (() => {
  const pts = []
  for (let a = A0 - 4; a <= A1 + 2; a += 6) {
    const rad = (a * Math.PI) / 180
    pts.push(`${(CX - R * Math.cos(rad)).toFixed(1)},${(CY + R * Math.sin(rad)).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
})()
const LEAF = 'M0,-10 C5.8,-4.6 5.8,4.6 0,10 C-5.8,4.6 -5.8,-4.6 0,-10Z'
const CROWN = 'M33 22 L35 7 L43 15 L50 2 L57 15 L65 7 L67 22 Q50 26 33 22 Z'

// Medalla "Master" de un juego: laureles + corona del color del nivel, con el ícono del juego al medio.
export default function GameMedal({ game, icons, tier = 'bronze', size = 84 }) {
  const id = useId().replace(/:/g, '')
  return (
    <span className={`gmedal tier-${tier}`} style={{ '--ms': `${size}px` }} role="img" aria-label={`Medalla de ${TIER_LABEL[tier]} en ${game}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="var(--m1)" />
            <stop offset="0.5" stopColor="var(--m2)" />
            <stop offset="1" stopColor="var(--m3)" />
          </linearGradient>
        </defs>
        {[false, true].map((mirror) => (
          <g key={String(mirror)} transform={mirror ? 'translate(100 0) scale(-1 1)' : undefined} fill={`url(#g${id})`} stroke="var(--m3)" strokeWidth="0.5">
            <path d={STEM} fill="none" stroke={`url(#g${id})`} strokeWidth="1.6" strokeLinecap="round" />
            {LEAVES.map((l, i) => (
              <path key={i} d={LEAF} transform={`translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${l.rot.toFixed(1)}) scale(${(l.k * 0.95).toFixed(2)})`} />
            ))}
          </g>
        ))}
        <path d={CROWN} fill={`url(#g${id})`} stroke="var(--m3)" strokeWidth="0.6" strokeLinejoin="round" />
      </svg>
      <span className="gm-core">
        <GameIcon name={game} icons={icons} size={Math.round(size * 0.46)} round />
      </span>
    </span>
  )
}
