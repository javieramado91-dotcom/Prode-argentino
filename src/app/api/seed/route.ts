import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient();

    // Solo administradores (este endpoint borra e inserta partidos de prueba).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Prohibido' }, { status: 403 });

    const matches = [
      {
        home_team: 'Belgrano',
        away_team: 'Rosario Central',
        match_date: new Date(Date.now() + 2 * 3600000).toISOString(), // En un rato
        status: 'pending',
      },
      {
        home_team: 'Sarmiento',
        away_team: 'Argentinos JRS',
        match_date: new Date(Date.now() + 2 * 3600000).toISOString(),
        status: 'pending',
      },
      {
        home_team: 'Defensa y Justicia',
        away_team: 'Aldosivi',
        match_date: new Date(Date.now() + 24 * 3600000).toISOString(), // Mañana
        status: 'pending',
      },
      {
        home_team: 'Boca Juniors',
        away_team: 'River Plate',
        match_date: new Date(Date.now() + 48 * 3600000).toISOString(), // Pasado mañana
        status: 'pending',
      },
      {
        home_team: 'Racing Club',
        away_team: 'Independiente',
        match_date: new Date(Date.now() + 48 * 3600000).toISOString(), // Pasado mañana
        status: 'pending',
      }
    ];

    // Primero borramos si ya habían algunos de prueba para evitar basura
    await supabase.from('matches').delete().neq('status', 'nonexistent');

    const { error } = await supabase.from('matches').insert(matches);
    
    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Partidos sembrados con éxito', count: matches.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
