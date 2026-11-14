import { useEffect, useState } from 'react'

const fmt = new Intl.NumberFormat('es-AR')

// Número que sube hasta `value` cuando `run` pasa a true.
export default function CountUp({ value, run = true, duration = 1200 }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!run) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(value)
      return
    }
    let raf
    let start
    const tick = (t) => {
      start ??= t
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, run, duration])

  return <>{fmt.format(n)}</>
}
