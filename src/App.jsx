import { useState, useCallback } from 'react'
import AuroraBackground from './components/AuroraBackground.jsx'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Tops from './components/Tops.jsx'
import MemberModal from './components/MemberModal.jsx'
import MembersPanel from './components/MembersPanel.jsx'
import { MemberContext } from './context/MemberContext.jsx'
import { SERVER } from './config.js'
import { useMembers } from './hooks/useMembers.js'

export default function App() {
  const { members, meta, gameIcons, live, stale } = useMembers()
  const [selectedId, setSelectedId] = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  const selected = members.find((m) => m.id === selectedId)

  const openMember = useCallback((id) => {
    setShowMembers(false)
    setSelectedId(id)
  }, [])

  return (
    <MemberContext.Provider value={openMember}>
      <AuroraBackground />
      <div className="page">
        <Nav onOpenMembers={() => setShowMembers(true)} />
        <main>
          <Hero members={members} meta={meta} />
          <Leaderboard members={members} icons={gameIcons} live={live} stale={stale} />
          <Tops members={members} icons={gameIcons} />
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
      {showMembers && <MembersPanel members={members} onClose={() => setShowMembers(false)} />}
      {selected && <MemberModal member={selected} icons={gameIcons} onClose={() => setSelectedId(null)} />}
    </MemberContext.Provider>
  )
}
