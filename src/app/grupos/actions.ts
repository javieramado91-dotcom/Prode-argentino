'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export type UserMatch = { id: string; display_name: string };

// Busca personas por nombre para sumar al torneo (solo miembros; excluye a los
// que ya están). Devuelve hasta 10 coincidencias.
export async function searchUsersForGroup(groupId: string, query: string): Promise<UserMatch[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debés iniciar sesión.');

  const { data, error } = await supabase.rpc('search_users_for_group', { gid: groupId, q });
  if (error) {
    console.error('search_users_for_group:', error.message);
    throw new Error('No se pudo buscar usuarios.');
  }
  return data || [];
}

export type GroupPrediction = {
  display_name: string
  predicted_home_score: number
  predicted_away_score: number
  points_earned: number | null
}

// Pronósticos de un partido, SOLO de los miembros de este torneo (y solo si el
// partido ya empezó). Así cada uno ve a sus contrincantes, no a todos.
export async function getGroupMatchPredictions(
  groupId: string,
  matchId: string
): Promise<GroupPrediction[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Debés iniciar sesión.')

  const { data, error } = await supabase.rpc('get_group_match_predictions', {
    gid: groupId,
    mid: matchId,
  })
  if (error) {
    console.error('get_group_match_predictions:', error.message)
    throw new Error('No se pudieron cargar los pronósticos.')
  }
  return data || []
}

// Agrega a una persona al torneo por su id (la eligió de la búsqueda por nombre).
export async function addUserToGroup(groupId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debés iniciar sesión.');

  const { error } = await supabase.rpc('add_user_to_group', { gid: groupId, uid: userId });
  if (error) {
    console.error('add_user_to_group:', error.message);
    throw new Error(error.message || 'No se pudo agregar a la persona.');
  }
  revalidatePath(`/grupos/${groupId}`);
  return { ok: true };
}

export async function createGroupAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string)?.trim();
  if (!name) redirect('/grupos?error=' + encodeURIComponent('Poné un nombre al torneo'));

  const startRound = ((formData.get('start_round') as string) || '').trim() || null;

  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_start_round: startRound,
  });
  if (error) redirect('/grupos?error=' + encodeURIComponent(error.message));

  const groupId = data?.[0]?.id;
  redirect(groupId ? `/grupos/${groupId}` : '/grupos');
}

export async function joinGroupAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const code = (formData.get('code') as string)?.trim();
  if (!code) redirect('/grupos?error=' + encodeURIComponent('Ingresá un código'));

  const { data, error } = await supabase.rpc('join_group', { p_code: code });
  if (error) redirect('/grupos?error=' + encodeURIComponent(error.message));

  redirect(data ? `/grupos/${data}` : '/grupos');
}
