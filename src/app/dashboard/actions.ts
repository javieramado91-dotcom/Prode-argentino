'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { PREDICTABLE_ROUNDS } from '@/lib/prode';

export async function savePrediction(matchId: string, homeScore: number, awayScore: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para predecir.');
  }

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 99 || awayScore > 99) {
    throw new Error('Resultado inválido.');
  }

  // 1. Validar que el partido exista y que todavía no haya empezado.
  const { data: match } = await supabase
    .from('matches')
    .select('status, match_date, round')
    .eq('id', matchId)
    .single();

  if (!match) throw new Error('Partido no encontrado.');

  // El pronóstico se bloquea EXACTAMENTE a la hora de inicio del partido,
  // sin depender de que la sincronización ya haya cambiado el estado.
  const hasStarted = new Date(match.match_date).getTime() <= Date.now();
  if (match.status !== 'pending' || hasStarted) {
    throw new Error('El partido ya comenzó o finalizó. No se puede predecir.');
  }

  // Solo se puede predecir dentro de la ventana de las próximas fechas
  // (misma regla que muestra la UI, validada también en el servidor).
  const { data: pendingRounds } = await supabase
    .from('matches')
    .select('round, match_date')
    .eq('status', 'pending')
    .gt('match_date', new Date().toISOString())
    .order('match_date', { ascending: true });

  const window = new Set(
    Array.from(new Set((pendingRounds || []).map((r: any) => r.round))).sort().slice(0, PREDICTABLE_ROUNDS)
  );
  if (match.round && !window.has(match.round)) {
    throw new Error('Ese partido todavía no está habilitado: se puede predecir la fecha actual y las 2 siguientes.');
  }

  // 2. Guardar o actualizar la predicción.
  const { error } = await supabase
    .from('predictions')
    .upsert({
      user_id: user.id,
      match_id: matchId,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id, match_id'
    });

  if (error) {
    console.error('Error saving prediction:', error);
    throw new Error('Hubo un error al guardar tu predicción.');
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export type MatchPredictionRow = {
  display_name: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number | null;
};

// Pronósticos de tus compañeros de torneo para un partido.
// La función SQL solo devuelve filas si el partido ya empezó (en vivo o
// finalizado) y solo de personas con las que compartís al menos un torneo.
export async function getMatchPredictions(matchId: string): Promise<MatchPredictionRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes iniciar sesión.');

  const { data, error } = await supabase.rpc('get_match_predictions', { mid: matchId });
  if (error) {
    console.error('get_match_predictions:', error.message);
    throw new Error('No se pudieron cargar los pronósticos.');
  }
  return data || [];
}
