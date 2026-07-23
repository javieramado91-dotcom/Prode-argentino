'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) throw new Error('Prohibido');
  return supabase;
}

export async function approveUser(formData: FormData) {
  const supabase = await requireAdmin();
  const userId = formData.get('userId') as string;

  const { error } = await supabase
    .from('users')
    .update({ is_approved: true })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  revalidatePath('/admin');
  revalidatePath('/dashboard');
}

// Elimina un usuario por completo (perfil, pronósticos, membresías y cuenta).
export async function deleteUser(formData: FormData) {
  const supabase = await requireAdmin();
  const userId = formData.get('userId') as string;

  const { error } = await supabase.rpc('admin_delete_user', { uid: userId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
  revalidatePath('/dashboard');
}

// Marca un partido como "Partido de la Fecha" (vale doble). Solo uno por ronda:
// primero limpia el destacado de esa ronda y luego marca el elegido.
export async function toggleFeatured(formData: FormData) {
  const supabase = await requireAdmin();
  const matchId = formData.get('matchId') as string;

  const { data: match } = await supabase
    .from('matches')
    .select('round, featured')
    .eq('id', matchId)
    .single();
  if (!match) throw new Error('Partido no encontrado');

  // Desmarca todos los de la misma ronda.
  await supabase.from('matches').update({ featured: false }).eq('round', match.round);

  // Si no estaba destacado, lo destaca (si ya lo estaba, queda desmarcado).
  if (!match.featured) {
    await supabase.from('matches').update({ featured: true }).eq('id', matchId);
  }

  // Los puntos cambian según el x2: recalcular.
  await supabase.rpc('recalculate_points');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
}
