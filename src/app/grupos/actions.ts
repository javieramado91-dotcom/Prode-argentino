'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

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
