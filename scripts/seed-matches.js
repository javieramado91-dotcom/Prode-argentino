import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const matches = [
    {
      home_team: 'Belgrano',
      away_team: 'Rosario Central',
      match_date: '2026-07-23T22:30:00Z', // 19:30 ART = 22:30 UTC
      status: 'pending',
      home_logo: 'https://media.api-sports.io/football/teams/431.png',
      away_logo: 'https://media.api-sports.io/football/teams/448.png',
      round: 'Fecha 1'
    },
    {
      home_team: 'Sarmiento',
      away_team: 'Argentinos JRS',
      match_date: '2026-07-23T22:30:00Z',
      status: 'pending',
      home_logo: 'https://media.api-sports.io/football/teams/459.png',
      away_logo: 'https://media.api-sports.io/football/teams/443.png',
      round: 'Fecha 1'
    },
    {
      home_team: 'Defensa y Justicia',
      away_team: 'Aldosivi',
      match_date: '2026-07-24T00:45:00Z', // 21:45 ART = 00:45 UTC next day
      status: 'pending',
      home_logo: 'https://media.api-sports.io/football/teams/445.png',
      away_logo: 'https://media.api-sports.io/football/teams/444.png',
      round: 'Fecha 1'
    },
    {
      home_team: 'Boca Juniors',
      away_team: 'River Plate',
      match_date: '2026-07-24T20:00:00Z',
      status: 'pending',
      home_logo: 'https://media.api-sports.io/football/teams/451.png',
      away_logo: 'https://media.api-sports.io/football/teams/435.png',
      round: 'Fecha 1'
    },
    {
      home_team: 'Racing Club',
      away_team: 'Independiente',
      match_date: '2026-07-24T23:00:00Z',
      status: 'pending',
      home_logo: 'https://media.api-sports.io/football/teams/436.png',
      away_logo: 'https://media.api-sports.io/football/teams/438.png',
      round: 'Fecha 1'
    }
  ];

  const { data, error } = await supabase.from('matches').insert(matches);
  if (error) {
    console.error('Error insertando:', error);
  } else {
    console.log('Partidos insertados exitosamente.');
  }
}

seed();
