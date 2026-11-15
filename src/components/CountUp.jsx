import { useEffect, useRef, useState } from 'react'

const formatters = {}
const formatter = (decimals) =>
  (formatters[decimals] ??= new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }))

// Número que sube hasta `value`. Si el valor cambia más tarde (datos en vivo),
// anima desde lo que se estaba mostrando, no desde cero.
export default function CountUp({ value, run = true, duration = 1200, decimals = 0 }) {
  const [n, setN] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    if (!run) return
    const from = shown.current
    if (from === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.current = value
      setN(value)
      return
    }
    let raf
    let start
    const tick = (t) => {
      start ??= t
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = from + (value - from) * eased
      shown.current = v
      setN(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, run, duration])

  return <>{formatter(decimals).format(n)}</>
}
