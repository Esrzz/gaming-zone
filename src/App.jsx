import AuroraBackground from './components/AuroraBackground.jsx'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Tops from './components/Tops.jsx'
import { SERVER } from './config.js'
import { MEMBERS } from './data/mock.js'

export default function App() {
  return (
    <>
      <AuroraBackground />
      <div className="page">
        <Nav />
        <main>
          <Hero members={MEMBERS} />
          <Leaderboard members={MEMBERS} />
          <Tops members={MEMBERS} />
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
