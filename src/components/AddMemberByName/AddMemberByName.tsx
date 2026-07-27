'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchUsersForGroup, addUserToGroup, type UserMatch } from '@/app/grupos/actions'

// Buscador que suma gente al torneo por nombre (sin código de invitación).
export default function AddMemberByName({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const seq = useRef(0)

  // Búsqueda con debounce a medida que escribís.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const id = ++seq.current
    const t = setTimeout(async () => {
      try {
        const r = await searchUsersForGroup(groupId, q)
        if (id === seq.current) setResults(r)
      } catch {
        if (id === seq.current) setResults([])
      } finally {
        if (id === seq.current) setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, groupId])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3000)
  }

  async function add(u: UserMatch) {
    setAddingId(u.id)
    try {
      await addUserToGroup(groupId, u.id)
      setResults((prev) => prev.filter((x) => x.id !== u.id))
      flash(`✅ ${u.display_name} se sumó al torneo`)
      router.refresh()
    } catch (e: any) {
      flash(e?.message || 'No se pudo agregar.')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <section className="glass-panel" style={{ padding: '1.25rem', marginTop: '2rem' }}>
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem' }}>➕ Agregar por nombre</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.86rem', margin: '0 0 0.9rem', lineHeight: 1.45 }}>
        Buscá a la persona por su nombre y sumala directo, sin que tenga que copiar ningún código.
        (Tiene que estar registrada y aprobada en el Prode.)
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Escribí un nombre…"
        className="input"
        style={{
          width: '100%',
          padding: '0.7rem 0.9rem',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--color-text-main)',
          fontSize: '0.95rem',
        }}
      />

      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {searching && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Buscando…</div>}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No encontré a nadie con ese nombre que no esté ya en el torneo.
          </div>
        )}

        {results.map((u) => (
          <div
            key={u.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.8rem',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.8rem',
                color: '#00122e',
              }}
            >
              {u.display_name.substring(0, 2).toUpperCase()}
            </div>
            <span style={{ flex: 1, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.display_name}
            </span>
            <button className="btn-primary" onClick={() => add(u)} disabled={addingId === u.id} style={{ fontSize: '0.82rem' }}>
              {addingId === u.id ? 'Agregando…' : 'Agregar'}
            </button>
          </div>
        ))}
      </div>

      {msg && <p style={{ marginTop: '0.75rem', marginBottom: 0, color: 'var(--color-accent)', fontSize: '0.88rem' }}>{msg}</p>}
    </section>
  )
}
