import { useState, useCallback, useMemo } from 'react'
import AuroraBackground from './components/AuroraBackground.jsx'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Tops from './components/Tops.jsx'
import MemberModal from './components/MemberModal.jsx'
import RecordsStory from './components/RecordsStory.jsx'
import MembersPanel from './components/MembersPanel.jsx'
import EventsLog from './components/EventsLog.jsx'
import Notice from './components/Notice.jsx'
import { MemberContext } from './context/MemberContext.jsx'
import { SERVER } from './config.js'
import { useMembers } from './hooks/useMembers.js'
import { useAuth } from './hooks/useAuth.js'

// Les agrega el estado actual (en línea, ausente...) a los ganadores, para el puntito del avatar
function withStatus(records, members) {
  const byId = Object.fromEntries(members.map((m) => [m.id, m]))
  return records.map((r) => ({ ...r, holders: r.holders.map((h) => (h.id ? { ...h, status: byId[h.id]?.status } : h)) }))
}

export default function App() {
  const { members, meta, gameIcons, musicTop, records, masters, events, live, stale } = useMembers()
  const { user, notice, dismissNotice, connections, logout, removeConnections } = useAuth()
  const [selectedId, setSelectedId] = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showRecords, setShowRecords] = useState(false)
  const [showEvents, setShowEvents] = useState(false)
  // Novedades que esta persona todavía no vio (se recuerda en su navegador; si no se puede, no pasa nada)
  const [seen, setSeen] = useState(() => {
    try { return Number(localStorage.getItem('gz-events-seen')) || 0 } catch { return 0 }
  })
  const newest = events[0]?.t ?? 0
  const unread = useMemo(() => (seen ? events.filter((e) => e.t > seen).length : 0), [events, seen])
  const openEvents = () => {
    setShowEvents(true)
    setSeen(newest)
    try { if (newest) localStorage.setItem('gz-events-seen', String(newest)) } catch { /* sin almacenamiento */ }
  }
  const selected = members.find((m) => m.id === selectedId)
  const me = user ? members.find((m) => m.id === user.id) ?? { id: user.id, name: user.name, status: 'offline' } : null

  const openMember = useCallback((id) => {
    setShowMembers(false)
    setShowRecords(false)
    setShowEvents(false)
    setSelectedId(id)
  }, [])

  return (
    <MemberContext.Provider value={openMember}>
      <AuroraBackground />
      <Notice notice={notice} onClose={dismissNotice} />
      <div className="page">
        <Nav
          onOpenMembers={() => setShowMembers(true)} onOpenRecords={() => setShowRecords(true)} onOpenEvents={openEvents}
          unread={unread}
          account={me && { me, hasConnections: Boolean(connections[me.id]?.length), onOpenProfile: () => openMember(me.id), onRemoveConnections: removeConnections, onLogout: logout }}
        />
        <main>
          <Hero members={members} meta={meta} />
          <Leaderboard members={members} icons={gameIcons} live={live} stale={stale} />
          <Tops members={members} icons={gameIcons} music={musicTop} masters={masters} />
        </main>
        <footer className="footer">
          <div className="wrap footer-inner">
            <span>{SERVER.name}</span>
            <a href={SERVER.invite} target="_blank" rel="noreferrer">
              Unirme al Discord
            </a>
          </div>
        </footer>
      </div>
      {showRecords && <RecordsStory records={withStatus(records, members)} icons={gameIcons} onClose={() => setShowRecords(false)} />}
      {showEvents && <EventsLog events={events} members={members} icons={gameIcons} onClose={() => setShowEvents(false)} />}
      {showMembers && <MembersPanel members={members} onClose={() => setShowMembers(false)} />}
      {selected && <MemberModal member={selected} members={members} masters={masters} connections={connections[selected.id]} icons={gameIcons} onClose={() => setSelectedId(null)} />}
    </MemberContext.Provider>
  )
}
