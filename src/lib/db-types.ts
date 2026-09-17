// Formas de las filas que devuelve Supabase. El cliente no está tipado contra
// el esquema, así que las consultas devolvían `any` y cada página lo anotaba a
// mano. Tenerlas acá una sola vez evita eso y hace que un `m.rund` mal escrito
// lo marque el compilador.

export type MatchStatus = 'pending' | 'in_progress' | 'finished'

export type MatchRow = {
  id: string
  api_id: number | null
  home_team: string
  away_team: string
  home_logo: string | null
  away_logo: string | null
  match_date: string
  round: string | null
  status: MatchStatus
  // Minuto real del partido en vivo según ESPN (ej: "65'", "Entretiempo").
  status_detail: string | null
  home_score: number | null
  away_score: number | null
  featured: boolean
}

export type PredictionRow = {
  id: string
  user_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  points_earned: number | null
}

export type UserRow = {
  id: string
  email: string
  display_name: string | null
  is_admin: boolean
  is_approved: boolean
  created_at: string | null
}
