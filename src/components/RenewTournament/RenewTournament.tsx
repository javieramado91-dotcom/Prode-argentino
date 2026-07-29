import { renewGroupAction } from '@/app/grupos/actions'

// Estado de fin de torneo + botón "Renovar torneo".
// - finalized: el torneo argentino terminó y este torneo ya tenía fechas en juego.
// - waiting: torneo recién renovado, esperando que arranque el nuevo torneo argentino.
export default function RenewTournament({
  groupId,
  finalized,
  waiting,
  isOwner,
}: {
  groupId: string
  finalized: boolean
  waiting: boolean
  isOwner: boolean
}) {
  if (waiting) {
    return (
      <section
        className="glass-panel"
        style={{ padding: '1rem 1.25rem', marginTop: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', borderColor: 'var(--color-accent)' }}
      >
        ⏳ Torneo listo. Empieza a puntuar cuando arranque el próximo torneo argentino.
      </section>
    )
  }

  if (!finalized) return null

  return (
    <section
      className="glass-panel"
      style={{ padding: '1.5rem', marginTop: '2rem', textAlign: 'center', borderColor: 'var(--color-warning)' }}
    >
      <div style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>🏁</div>
      <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Torneo finalizado</div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: '0.4rem 0 1rem', lineHeight: 1.45 }}>
        El torneo argentino terminó, así que este torneo cerró con la tabla de arriba como resultado final.
        {isOwner ? ' Podés renovarlo para el próximo torneo argentino con los mismos jugadores.' : ' El creador puede renovarlo para el próximo torneo argentino.'}
      </p>
      {isOwner && (
        <form action={renewGroupAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <button type="submit" className="btn-primary">🔄 Renovar torneo (nuevo torneo argentino)</button>
        </form>
      )}
    </section>
  )
}
