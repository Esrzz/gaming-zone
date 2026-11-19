import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import Avatar from './Avatar.jsx'
import GameIcon from './GameIcon.jsx'
import { MemberLink } from '../context/MemberContext.jsx'
import { RECORDS } from '../data/records.js'

const when = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

function Holders({ record, data, icons }) {
  if (!data) {
    return (
      <p className="unclaimed">
        Nadie lo consiguió todavía.<br />
        <strong>¿Vas a ser el primero?</strong>
      </p>
    )
  }
  const extraGame = data.holders[0]?.extra?.game
  return (
    <div className="holders">
      <ul className="holder-list">
        {data.holders.map((h) =>
          h.game ? (
            <li key={h.game} className="holder">
              <GameIcon name={h.game} icons={icons} size={44} />
              <span className="holder-name">{h.game}</span>
            </li>
          ) : (
            <li key={h.id} className="holder">
              <Avatar member={{ id: h.id, name: h.name ?? '?', avatar: h.avatar, status: h.status ?? 'offline' }} />
              <MemberLink id={h.id} name={h.name ?? '?'} className="holder-name" />
            </li>
          ),
        )}
      </ul>
      <p className="record-value">{record.format(data.value)}</p>
      {record.id === 'otp' && extraGame && (
        <p className="record-extra">
          jugando <GameIcon name={extraGame} icons={icons} size={20} /> <strong>{extraGame}</strong>
        </p>
      )}
      {record.id === 'janeo' && data.holders[0]?.extra?.players > 0 && (
        <p className="record-extra">jugado por {data.holders[0].extra.players} {data.holders[0].extra.players === 1 ? 'persona' : 'personas'}</p>
      )}
      {data.holders.length > 1 && <p className="record-extra">Empate: lo comparten</p>}
      <p className="record-since">
        {data.since ? `Desde el ${when(data.since)}` : ''}
        {data.previous ? ` · antes: ${data.previous.holders.join(', ')} (${record.format(data.previous.value)})` : ''}
      </p>
    </div>
  )
}

export default function RecordsStory({ records, icons, onClose }) {
  const [active, setActive] = useState(0)
  const root = useRef(null)
  const byId = Object.fromEntries((records ?? []).map((r) => [r.id, r]))

  useEffect(() => {
    const scenes = root.current?.querySelectorAll('.scene')
    if (!scenes?.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            setActive(Number(e.target.dataset.i))
          }
        }
      },
      { threshold: 0.55 },
    )
    scenes.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  // ---- Navegación escena por escena ----
  // Con la rueda del mouse (o el teclado) cada movimiento lleva directo a la escena siguiente,
  // con una animación suave, y nunca queda a mitad de camino. Si seguís girando, avanza más rápido.
  const nav = useRef({ target: 0, raf: 0, gesture: false, gestureTimer: 0 })

  const scrollerOf = () => root.current?.closest('.modal-body')
  const scenesOf = () => Array.from(root.current?.querySelectorAll('.scene') ?? [])

  // posición de scroll que deja la escena i centrada (o alineada arriba si es más alta que la ventana)
  const positionOf = (i) => {
    const box = scrollerOf()
    const el = scenesOf()[i]
    if (!box || !el) return 0
    const tall = el.offsetHeight > box.clientHeight
    const y = tall ? el.offsetTop : el.offsetTop - (box.clientHeight - el.offsetHeight) / 2
    return Math.max(0, Math.min(y, box.scrollHeight - box.clientHeight))
  }

  const nearest = () => {
    const box = scrollerOf()
    const scenes = scenesOf()
    if (!box || !scenes.length) return 0
    const mid = box.scrollTop + box.clientHeight / 2
    let best = 0
    let dist = Infinity
    scenes.forEach((el, i) => {
      const d = Math.abs(el.offsetTop + el.offsetHeight / 2 - mid)
      if (d < dist) { dist = d; best = i }
    })
    return best
  }

  const animateTo = (i, fast) => {
    const box = scrollerOf()
    if (!box) return
    const n = nav.current
    const last = scenesOf().length - 1
    n.target = Math.max(0, Math.min(last, i))
    setActive(n.target)
    cancelAnimationFrame(n.raf)
    const from = box.scrollTop
    const to = positionOf(n.target)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 0 : Math.min(900, Math.max(320, (fast ? 380 : 700) * Math.min(1.4, Math.abs(to - from) / box.clientHeight || 1)))
    if (duration === 0 || from === to) { box.scrollTop = to; return }
    const t0 = performance.now()
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) // suave al empezar y al terminar
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration)
      box.scrollTop = from + (to - from) * ease(t)
      if (t < 1) n.raf = requestAnimationFrame(tick)
    }
    n.raf = requestAnimationFrame(tick)
  }

  const go = (i) => animateTo(i, false)

  useEffect(() => {
    const box = scrollerOf()
    if (!box) return
    const n = nav.current
    const animating = () => Math.abs(box.scrollTop - positionOf(n.target)) > 2

    const step = (dir, fast) => {
      const base = animating() ? n.target : nearest()
      animateTo(base + dir, fast)
    }

    // Si la escena es más alta que la ventana (pantallas bajas), se deja scrollear dentro de ella con normalidad
    const insideTallScene = (dir) => {
      if (animating()) return false
      const el = scenesOf()[nearest()]
      if (!el || el.offsetHeight <= box.clientHeight + 4) return false
      const top = el.offsetTop
      const bottom = top + el.offsetHeight
      return dir > 0 ? box.scrollTop + box.clientHeight < bottom - 2 : box.scrollTop > top + 2
    }

    const onWheel = (e) => {
      if (e.ctrlKey) return // zoom del navegador
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      const dir = Math.sign(delta)
      if (!dir) return
      if (insideTallScene(dir)) return
      e.preventDefault()

      const mouseNotch = e.deltaMode === 1 || Math.abs(delta) >= 90
      if (mouseNotch) {
        // cada "click" de la rueda = una escena; si siguen llegando, se encadenan más rápido
        step(dir, animating())
        return
      }
      // trackpad: un gesto (con su inercia) = una escena
      clearTimeout(n.gestureTimer)
      n.gestureTimer = setTimeout(() => (n.gesture = false), 140)
      if (n.gesture || Math.abs(delta) < 4) return
      n.gesture = true
      step(dir, false)
    }

    const onKey = (e) => {
      const keys = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': e.shiftKey ? -1 : 1 }
      if (e.key in keys && !(e.target instanceof HTMLElement && e.target.closest('input, textarea'))) {
        e.preventDefault()
        step(keys[e.key], animating())
      } else if (e.key === 'Home') { e.preventDefault(); animateTo(0, true) }
      else if (e.key === 'End') { e.preventDefault(); animateTo(scenesOf().length - 1, true) }
    }

    const stop = () => cancelAnimationFrame(n.raf) // si tocás o arrastrás, manda el usuario
    box.addEventListener('wheel', onWheel, { passive: false })
    box.addEventListener('touchstart', stop, { passive: true })
    box.addEventListener('pointerdown', stop)
    document.addEventListener('keydown', onKey)
    return () => {
      box.removeEventListener('wheel', onWheel)
      box.removeEventListener('touchstart', stop)
      box.removeEventListener('pointerdown', stop)
      document.removeEventListener('keydown', onKey)
      cancelAnimationFrame(n.raf)
      clearTimeout(n.gestureTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Modal
      variant="story-mode"
      title="Récords"
      onClose={onClose}
      header={
        <div className="grow">
          <h2>Salón de récords</h2>
          <p>Las medallas de Gaming Zone. Superá un récord y es tuyo.</p>
        </div>
      }
    >
      <div ref={root} className="story">
        <nav className="rail" aria-label="Ir a un récord">
          {RECORDS.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className={i === active ? 'on' : ''}
              onClick={() => go(i)}
              aria-label={r.title}
              title={r.title}
            />
          ))}
        </nav>

        {RECORDS.map((r, i) => {
          const data = byId[r.id]
          return (
            <section key={r.id} data-i={i} className={`scene ${r.featured ? 'featured' : ''} ${data ? '' : 'locked'}`} aria-label={r.title}>
              <div className="scene-art">
                <img src={r.image} alt={`Medalla ${r.title}: ${r.short}`} width="720" height="240" loading={i < 2 ? 'eager' : 'lazy'} />
              </div>
              <div className="scene-text">
                <h3>{r.title}</h3>
                <p className="scene-desc">{r.desc}</p>
                <Holders record={r} data={data} icons={icons} />
              </div>
            </section>
          )
        })}
      </div>
    </Modal>
  )
}
