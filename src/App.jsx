import AuroraBackground from './components/AuroraBackground.jsx'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Tops from './components/Tops.jsx'
import { SERVER } from './config.js'
import { useMembers } from './hooks/useMembers.js'

export default function App() {
  const { members, meta, live } = useMembers()

  return (
    <>
      <AuroraBackground />
      <div className="page">
        <Nav />
        <main>
          <Hero members={members} meta={meta} />
          <Leaderboard members={members} live={live} />
          <Tops members={members} />
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
    </>
  )
}
