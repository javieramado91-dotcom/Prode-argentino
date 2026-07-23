const supabaseUrl = 'https://uxdnedasfycjuopplrdh.supabase.co';
const supabaseKey = 'sb_publishable_yTGoxplxXwc5FtL2zUI5tQ_bmcQtPl4'; // Anon key is fine for insert if RLS is disabled, wait, RLS might be enabled.

async function seed() {
  const matches = [
    {
      home_team: 'Belgrano',
      away_team: 'Rosario Central',
      match_date: '2026-07-23T22:30:00Z',
      status: 'pending',
      home_score: null,
      away_score: null
    },
    {
      home_team: 'Sarmiento',
      away_team: 'Argentinos JRS',
      match_date: '2026-07-23T22:30:00Z',
      status: 'pending',
      home_score: null,
      away_score: null
    },
    {
      home_team: 'Defensa y Justicia',
      away_team: 'Aldosivi',
      match_date: '2026-07-24T00:45:00Z',
      status: 'pending',
      home_score: null,
      away_score: null
    },
    {
      home_team: 'Boca Juniors',
      away_team: 'River Plate',
      match_date: '2026-07-24T20:00:00Z',
      status: 'pending',
      home_score: null,
      away_score: null
    },
    {
      home_team: 'Racing Club',
      away_team: 'Independiente',
      match_date: '2026-07-24T23:00:00Z',
      status: 'pending',
      home_score: null,
      away_score: null
    }
  ];

  const res = await fetch(`${supabaseUrl}/rest/v1/matches`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(matches)
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Error insertando:', error);
  } else {
    console.log('Partidos insertados exitosamente.');
  }
}

seed();
