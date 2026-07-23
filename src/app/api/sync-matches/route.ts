import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Fuente de datos: API pública de ESPN (gratis, sin API key, temporada ACTUAL
// y con estado en vivo). Liga Profesional Argentina = "arg.1".
// Endpoint: .../scoreboard?dates=YYYYMMDD-YYYYMMDD
const ESPN_LEAGUE = process.env.ESPN_LEAGUE_SLUG || 'arg.1'

type EspnCompetitor = {
  homeAway: 'home' | 'away'
  score?: string
  team: { displayName: string; logo?: string }
}
type EspnEvent = {
  id: string
  date: string
  status: { type: { state: 'pre' | 'in' | 'post'; completed?: boolean } }
  competitions: { competitors: EspnCompetitor[] }[]
}

function mapState(state: string): 'pending' | 'in_progress' | 'finished' {
  if (state === 'in') return 'in_progress'
  if (state === 'post') return 'finished'
  return 'pending'
}

function toScore(c: EspnCompetitor): number | null {
  const n = parseInt(c?.score ?? '', 10)
  return Number.isFinite(n) ? n : null
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

async function fetchEvents(from: Date, to: Date): Promise<EspnEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}/scoreboard?dates=${yyyymmdd(from)}-${yyyymmdd(to)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`)
  const data = await res.json()
  return (data.events || []) as EspnEvent[]
}

function teamsOf(e: EspnEvent): string[] {
  return e.competitions[0].competitors.map((c) => c.team.displayName)
}

// Aísla la "fecha" vigente: arranca en el próximo partido a jugarse (o en curso)
// y corta cuando un equipo se repite (en el fútbol argentino cada equipo juega
// una sola vez por fecha, así que la repetición marca el inicio de la siguiente).
function currentFecha(events: EspnEvent[]): EspnEvent[] {
  if (events.length === 0) return []
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const dayMs = 24 * 60 * 60 * 1000

  // Primer partido no terminado (o, si ya terminaron todos, el último jugado).
  let startIdx = sorted.findIndex((e) => new Date(e.date).getTime() >= Date.now() - dayMs)
  if (startIdx === -1) startIdx = sorted.length - 1

  const seen = new Set<string>()
  const fecha: EspnEvent[] = []
  for (let i = startIdx; i < sorted.length; i++) {
    const names = teamsOf(sorted[i])
    if (names.some((n) => seen.has(n))) break
    names.forEach((n) => seen.add(n))
    fecha.push(sorted[i])
  }
  return fecha
}

export async function POST() {
  try {
    const supabase = await createClient()

    // 1. Autorización: solo administradores.
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Prohibido' }, { status: 403 })

    // 2. Traer una ventana amplia alrededor de hoy; si está vacía, mirar atrás.
    const now = new Date()
    let events = await fetchEvents(
      new Date(now.getTime() - 3 * 86400000),
      new Date(now.getTime() + 10 * 86400000)
    )
    if (events.length === 0) {
      events = await fetchEvents(new Date(now.getTime() - 21 * 86400000), now)
    }
    if (events.length === 0) {
      return NextResponse.json(
        { error: 'ESPN no devolvió partidos para esta liga en este período.' },
        { status: 404 }
      )
    }

    // 3. Quedarnos con la fecha vigente.
    const fecha = currentFecha(events)

    const rows = fecha.map((e) => {
      const comp = e.competitions[0].competitors
      const home = comp.find((c) => c.homeAway === 'home')!
      const away = comp.find((c) => c.homeAway === 'away')!
      const status = mapState(e.status.type.state)
      return {
        api_id: Number(e.id),
        home_team: home.team.displayName,
        away_team: away.team.displayName,
        home_logo: home.team.logo ?? null,
        away_logo: away.team.logo ?? null,
        match_date: e.date,
        round: 'Fecha en curso',
        status,
        home_score: status === 'pending' ? null : toScore(home),
        away_score: status === 'pending' ? null : toScore(away),
      }
    })

    // 4. Upsert idempotente por api_id.
    const { error: upsertError } = await supabase
      .from('matches')
      .upsert(rows, { onConflict: 'api_id' })
    if (upsertError) {
      return NextResponse.json(
        { error: 'Error guardando partidos', details: upsertError.message },
        { status: 500 }
      )
    }

    // 5. Recalcular puntos de los partidos ya finalizados.
    const { error: rpcError } = await supabase.rpc('recalculate_points')
    if (rpcError) console.error('recalculate_points:', rpcError.message)

    return NextResponse.json({ message: 'Sincronización exitosa', count: rows.length })
  } catch (err: any) {
    console.error('Sync Error:', err)
    return NextResponse.json({ error: 'Error interno', details: err.message }, { status: 500 })
  }
}
