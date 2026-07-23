'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function savePrediction(matchId: string, homeScore: number, awayScore: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para predecir.');
  }

  // 1. Validar que el partido exista y que todavía no haya empezado.
  const { data: match } = await supabase
    .from('matches')
    .select('status, match_date')
    .eq('id', matchId)
    .single();

  if (!match) throw new Error('Partido no encontrado.');

  // El pronóstico se bloquea EXACTAMENTE a la hora de inicio del partido,
  // sin depender de que la sincronización ya haya cambiado el estado.
  const hasStarted = new Date(match.match_date).getTime() <= Date.now();
  if (match.status !== 'pending' || hasStarted) {
    throw new Error('El partido ya comenzó o finalizó. No se puede predecir.');
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
