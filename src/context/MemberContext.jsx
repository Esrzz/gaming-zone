import { createContext, useContext } from 'react'

// Permite que cualquier nombre de la página abra la ficha del miembro.
export const MemberContext = createContext(() => {})
export const useOpenMember = () => useContext(MemberContext)

// Nombre clickeable
export function MemberLink({ id, name, className = '' }) {
  const open = useOpenMember()
  return (
    <button type="button" className={`mlink ${className}`} onClick={() => open(id)} title={`Ver a ${name}`}>
      {name}
    </button>
  )
}
