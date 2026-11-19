import { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import Avatar from './Avatar.jsx'
import { useOpenMember } from '../context/MemberContext.jsx'
import { STATUS_LABEL, fmtHours } from '../lib/format.js'

export default function MembersPanel({ members, onClose }) {
  const open = useOpenMember()
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return members
      .filter((m) => !term || m.name.toLowerCase().includes(term))
      .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, 'es'))
  }, [members, q])

  return (
    <Modal
      title="Miembros"
      onClose={onClose}
      header={
        <div className="grow">
          <h2>Miembros</h2>
          <p>{members.length} en total</p>
        </div>
      }
    >
      <input
        className="search"
        type="search"
        placeholder="Buscar por nombre"
        aria-label="Buscar miembro"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {list.length === 0 ? (
        <p className="modal-note">Nadie coincide con esa búsqueda.</p>
      ) : (
        <ul className="mgrid">
          {list.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => open(m.id)}>
                <Avatar member={m} />
                <span className="info">
                  <strong>{m.name}</strong>
                  <small>
                    {m.activity ? `Jugando a ${m.activity.name}` : STATUS_LABEL[m.status] ?? STATUS_LABEL.offline}
                  </small>
                </span>
                <span className="h">{m.hours > 0 ? fmtHours(m.hours) : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
