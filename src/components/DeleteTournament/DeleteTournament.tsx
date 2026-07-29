'use client'

import { useTransition } from 'react'
import { deleteGroupAction } from '@/app/grupos/actions'

// Botón para eliminar el torneo (solo el creador). Pide confirmación porque es
// irreversible y borra el torneo para todos los miembros.
export default function DeleteTournament({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [pending, start] = useTransition()

  function handleClick() {
    const ok = window.confirm(
      `¿Eliminar el torneo "${groupName}"?\n\nSe borra para todos los miembros y no se puede deshacer.`
    )
    if (ok) start(() => deleteGroupAction(groupId))
  }

  return (
    <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
      <button
        onClick={handleClick}
        disabled={pending}
        className="btn-ghost"
        style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)', fontSize: '0.85rem' }}
      >
        {pending ? 'Eliminando…' : '🗑 Eliminar torneo'}
      </button>
    </div>
  )
}
