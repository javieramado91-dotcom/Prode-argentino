'use client';

import React, { useMemo, useState } from 'react';
import MatchCard, { MatchProps } from '../MatchCard/MatchCard';
import Leaderboard from '../Leaderboard/Leaderboard';
import SeasonAwards from '../SeasonAwards/SeasonAwards';
import styles from './DashboardSections.module.css';
import { RESULT_ROUNDS_BACK } from '@/lib/prode';
import type { RoundScore } from '@/lib/awards';

type UserScore = { id: string; name: string; points: number };

type TabKey = 'jugar' | 'vivo' | 'resultados' | 'calendario' | 'ranking' | 'premios';

function roundKey(m: MatchProps): string {
  return m.round || m.matchDate.slice(0, 10);
}

function groupByRound(matches: MatchProps[]): [string, MatchProps[]][] {
  const map = new Map<string, MatchProps[]>();
  for (const m of matches) {
    const key = roundKey(m);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()];
}

function dateRange(matches: MatchProps[]): string {
  const dates = matches
    .map((m) => new Date(m.matchDate))
    .sort((a, b) => a.getTime() - b.getTime());
  const min = dates[0];
  const max = dates[dates.length - 1];
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(d);
  return min.toDateString() === max.toDateString() ? fmt(min) : `${fmt(min)} al ${fmt(max)}`;
}

function Groups({
  groups,
  numbers,
  empty,
}: {
  groups: [string, MatchProps[]][];
  numbers: Map<string, number>;
  empty: string;
}) {
  if (groups.length === 0) return <div className={styles.empty}>{empty}</div>;
  return (
    <>
      {groups.map(([key, matches]) => (
        <div key={key} className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupTitle}>
              {numbers.has(key) ? `Fecha ${numbers.get(key)}` : 'Fecha'}
            </span>
            <span className={styles.groupCount}>
              {dateRange(matches)} · {matches.length} partidos
            </span>
          </div>
          <div className={styles.grid}>
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function DashboardSections({
  matches,
  users,
  roundScores,
  roundOrder,
}: {
  matches: MatchProps[];
  users: UserScore[];
  roundScores: RoundScore[];
  roundOrder: string[];
}) {
  const live = useMemo(() => matches.filter((m) => m.status === 'in_progress'), [matches]);

  // Numeración de fechas: orden cronológico de todas las fechas conocidas.
  // Como la base acumula las fechas desde el inicio del torneo, el número es estable.
  const fechaNumbers = useMemo(() => {
    const keys = [...new Set(matches.map(roundKey))].sort();
    return new Map(keys.map((k, i) => [k, i + 1]));
  }, [matches]);

  const jugarGroups = useMemo(() => {
    const list = matches.filter((m) => m.predictable && m.status === 'pending');
    return groupByRound(list).sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);

  const resultadoGroups = useMemo(() => {
    // Ventana relativa a la fecha ACTUAL: la fecha en curso + 2 hacia atrás.
    // La fecha actual es la primera que todavía tiene partidos sin terminar;
    // si el campeonato terminó, es la última. El historial completo queda
    // siempre disponible en el Calendario.
    const sortedKeys = [...new Set(matches.map(roundKey))].sort();
    let curIdx = sortedKeys.findIndex((k) =>
      matches.some((m) => roundKey(m) === k && m.status !== 'finished')
    );
    if (curIdx === -1) curIdx = sortedKeys.length - 1;
    const window = new Set(
      sortedKeys.slice(Math.max(0, curIdx - RESULT_ROUNDS_BACK), curIdx + 1)
    );

    const list = matches.filter((m) => m.status === 'finished' && window.has(roundKey(m)));
    // Más reciente arriba: fechas de la más actual a la más vieja, y DENTRO de
    // cada fecha, el último partido jugado primero (para ver el resultado sin
    // scrollear hasta el fondo).
    return groupByRound(list)
      .map(
        ([key, ms]) =>
          [
            key,
            [...ms].sort(
              (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
            ),
          ] as [string, MatchProps[]]
      )
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [matches]);

  const calendarioGroups = useMemo(
    () =>
      groupByRound(matches)
        // Una fecha "transcurrida" (todos sus partidos finalizados) sale del
        // Calendario; su historial queda en Resultados. Dejamos solo las fechas
        // con al menos un partido por jugar o en curso.
        .filter(([, ms]) => ms.some((m) => m.status !== 'finished'))
        .sort((a, b) => a[0].localeCompare(b[0])),
    [matches]
  );

  const jugarCount = useMemo(
    () => jugarGroups.reduce((n, [, m]) => n + m.length, 0),
    [jugarGroups]
  );
  const resultadosCount = useMemo(
    () => resultadoGroups.reduce((n, [, m]) => n + m.length, 0),
    [resultadoGroups]
  );

  const [tab, setTab] = useState<TabKey>(live.length > 0 ? 'vivo' : 'jugar');

  const tabs: { key: TabKey; label: string; badge?: number; live?: boolean }[] = [
    { key: 'jugar', label: 'Por jugar', badge: jugarCount || undefined },
    ...(live.length > 0
      ? [{ key: 'vivo' as TabKey, label: 'En vivo', badge: live.length, live: true }]
      : []),
    { key: 'resultados', label: 'Resultados', badge: resultadosCount || undefined },
    { key: 'calendario', label: 'Calendario' },
    { key: 'ranking', label: 'Ranking' },
    { key: 'premios', label: '🏆 Premios' },
  ];

  return (
    <div>
      <div className={styles.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.badge != null && (
              <span className={`${styles.badge} ${t.live ? styles.liveBadge : ''}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'jugar' && (
        <Groups
          groups={jugarGroups}
          numbers={fechaNumbers}
          empty="No hay partidos abiertos para pronosticar por ahora. Volvé cuando se acerque la próxima fecha."
        />
      )}

      {tab === 'vivo' && (
        <div className={styles.group}>
          {live.length > 0 ? (
            <div className={styles.grid}>
              {live.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>No hay partidos en juego en este momento.</div>
          )}
        </div>
      )}

      {tab === 'resultados' && (
        <Groups groups={resultadoGroups} numbers={fechaNumbers} empty="Todavía no hay partidos finalizados." />
      )}

      {tab === 'calendario' && (
        <Groups groups={calendarioGroups} numbers={fechaNumbers} empty="Aún no hay fechas cargadas." />
      )}

      {tab === 'ranking' && <Leaderboard title="Ranking general" users={users} />}

      {tab === 'premios' && (
        <SeasonAwards scores={roundScores} roundOrder={roundOrder} context="general" />
      )}
    </div>
  );
}
